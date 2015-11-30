(function () {
    'use strict';

    var path = require('path');
    var moment = require('moment');
    var mongoose = require('mongoose');

    var Scan = require('../schemas/scanSchema');
    var PfsDistribution = require('../schemas/pfsDistributionSchema');

    // running as module or standalone?
    var standalone = !module.parent;
    var scriptName = path.basename(module.filename, path.extname(module.filename));

    // current month start and ends
    var monthStart = moment().set({'date': 1, 'hour': 0, 'minute': 0, 'second': 1, 'millisecond': 0});
    var monthEnd = moment(monthStart);
    monthEnd = monthEnd.add(1, 'months').subtract(2, 'seconds');

    // main function
    var startQuery = function() {
        mongoose.connect('mongodb://localhost:27017/tls', function(err) {
            if (err) { throw err; }
            Scan.aggregate([
                { $match: {
                    $and: [
                        {scanDate: {$gte: monthStart}},
                        {scanDate: {$lte: monthEnd}}
                    ]
                }},
                { $sort: {scanDate: -1} },
                { $group: {
                    _id: "$domain",
                    ciphers: {$first: "$ciphers" }
                }},
                { $unwind : "$ciphers" },
                { $project: {
                    _id: 0,
                    domain: "$_id",
                    cipher: "$ciphers"
                }},
                { $match: {
                    $or: [{"cipher.kx": "ECDH"}, {"cipher.kx": "DH"}]
                }},
                { $group: {
                    _id: {
                        domain: "$domain",
                        kx: "$cipher.kx",
                        kxStrength: "$cipher.kxStrength"
                    },
                    count: {$sum: 1}
                }},
                { $group: {
                    _id: {
                        kx: "$_id.kx",
                        kxStrength: "$_id.kxStrength"
                    },
                    count: {$sum: 1}
                }},
                { $project: {
                    _id: 0,
                    kx: "$_id.kx",
                    kxStrength: "$_id.kxStrength",
                    count: 1
                }},
                {
                    $sort: {count: -1}
                }
            ]).allowDiskUse(true).exec(function(err, result) {
                var d = new Date();
                var pfsDistribution = new PfsDistribution();
                pfsDistribution.month = d.getFullYear() + '_' + (d.getMonth()+1);
                pfsDistribution.distribution = result;

                var plainData = pfsDistribution.toObject();
                delete plainData._id;

                PfsDistribution.findOneAndUpdate({month: pfsDistribution.month}, plainData, {upsert:true}, function(err, doc){
                    if (err) { throw err; }
                    console.log("done...");
                    mongoose.disconnect();
                });
            });
        });
    };

    if (standalone) { startQuery(); }
    module.exports = { startQuery: startQuery };
}());
