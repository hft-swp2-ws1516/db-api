(function () {
    'use strict';

    var path = require('path');
    var async = require('async');
    var mongoose = require('mongoose');

    var Scan = require('../schemas/scanSchema');
    var PfsOverview = require('../schemas/pfsOverviewSchema');

    // running as module or standalone?
    var standalone = !module.parent;
    var scriptName = path.basename(module.filename, path.extname(module.filename));

    // main function
    var startQuery = function() {
        mongoose.connect('mongodb://localhost:27017/tls', function(err) {
            if (err) { throw err; }
            Scan.aggregate([
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
                    _id: "$domain",
                }},
                { $group: {
                    _id: null,
                    count: {$sum: 1}
                }}
            ]).allowDiskUse(true).exec(function(err, result) {
                var countEnabled = result[0].count;
                console.log("enabled", result);

                // count total distinct number of hosts
                Scan.aggregate([
                    { $sort: {scanDate: -1} },
                    { $group: {
                        _id: "$domain",
                    }},
                    { $group: {
                        _id: null,
                        count: {$sum: 1}
                    }}
                ]).allowDiskUse(true).exec(function(err, distinctHosts) {
                    var d = new Date();
                    var countTotal = distinctHosts[0].count;
                    var pfsOverview = new PfsOverview();
                    pfsOverview.month = d.getFullYear() + '_' + (d.getMonth()+1);
                    pfsOverview.pfsEnabled = countEnabled;
                    pfsOverview.pfsDisabled = countTotal - countEnabled;
                    pfsOverview.total = countTotal;

                    var plainData = pfsOverview.toObject();
                    delete plainData._id;

                    PfsOverview.findOneAndUpdate({month: pfsOverview.month}, plainData, {upsert:true}, function(err, doc){
                        if (err) { throw err; }
                        console.log("done...");
                        mongoose.disconnect();
                    });
                });
            });
        });
    };

    if (standalone) { startQuery(); }
    module.exports = { startQuery: startQuery };
}());
