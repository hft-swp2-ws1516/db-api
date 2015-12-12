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

    // main function
    var startQuery = function() {
        if (mongoose.connection.readyState === 0) {
            mongoose.connect('mongodb://localhost:27017/tls');
        }

        // log the currently executing aggregator
        console.log('Aggregator started:', scriptName);

        // current month start and ends
        var monthStart = moment().set({'date': 1, 'hour': 0, 'minute': 0, 'second': 1, 'millisecond': 0});
        var monthEnd = moment(monthStart);
        monthEnd = monthEnd.add(1, 'months').subtract(2, 'seconds');

        Scan.aggregate([
            // match all documents in the current month
            { $match: {
                scanDate: {$gte: monthStart.toDate(), $lte: monthEnd.toDate()}
            }},
            // get the distinct, newest scan of every domain
            { $sort: {scanDate: -1} },
            { $group: {
                _id: "$domain",
                ciphers: {$first: "$ciphers" }
            }},
            // unwind every cipher
            { $unwind : "$ciphers" },
            // cosmetics
            { $project: {
                _id: 0,
                domain: "$_id",
                cipher: "$ciphers"
            }},
            // match every pfs enabled cipher
            { $match: {
                $or: [{"cipher.kx": "ECDH"}, {"cipher.kx": "DH"}]
            }},
            // group by domain, kx and strenght
            { $group: {
                _id: {
                    domain: "$domain",
                    kx: "$cipher.kx",
                    kxStrength: "$cipher.kxStrength"
                },
                count: {$sum: 1}
            }},
            // now count per kx & strenght
            { $group: {
                _id: {
                    kx: "$_id.kx",
                    kxStrength: "$_id.kxStrength"
                },
                count: {$sum: 1}
            }},
            // cosmetics
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
            var pfsDistribution = new PfsDistribution();
            pfsDistribution.month = monthStart.year() + '_' + (monthStart.month()+1);
            pfsDistribution.distribution = result;

            var plainData = pfsDistribution.toObject();
            delete plainData._id;

            PfsDistribution.findOneAndUpdate({month: pfsDistribution.month}, plainData, {upsert:true}, function(err, doc){
                if (err) { throw err; }
                console.log('Aggregation done', scriptName);
                if (standalone) { mongoose.disconnect(); }
            });
        });
    };

    if (standalone) { startQuery(); }
    module.exports = { startQuery: startQuery };
}());
