(function () {
    'use strict';

    var path = require('path');
    var async = require('async');
    var mongoose = require('mongoose');

    var Scan = require('../schemas/scanSchema');
    var PfsDistribution = require('../schemas/pfsDistributionSchema');

    // running as module or standalone?
    var standalone = !module.parent;
    var scriptName = path.basename(module.filename, path.extname(module.filename));

    // main function
    var startQuery = function() {
        mongoose.connect('mongodb://localhost:27017/tls', function(err) {
            if (err) { throw err; }
            Scan.aggregate([
                // only use data of the current month
                { $match: {
                    $or: [{"cipher.kx": "ECDH"}, {"cipher.kx": "DH"}]
                }},
                // kill duplicate scans for a domain, use the latest
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
                        kxStrenght: "$cipher.kxStrenght"
                    },
                    count: {$sum: 1}
                }},
                { $group: {
                    _id: {
                        kx: "$_id.kx",
                        kxStrenght: "$_id.kxStrenght"
                    },
                    count: {$sum: 1}
                }},
                { $project: {
                    _id: 0,
                    kx: "$_id.kx",
                    kxStrenght: "$_id.kxStrenght",
                    count: 1
                }},
                {
                    $sort: {count: -1}
                }
            ]).allowDiskUse(true).exec(function(err, result) {
                var d = new Date();
                var pfsDistribution = new PfsDistribution();
                pfsDistribution.month = d.getFullYear() + '_' + (d.getMonth()+1);
                console.log(pfsDistribution.month);
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
