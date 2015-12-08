(function () {
    'use strict';

    var path = require('path');
    var moment = require('moment');
    var mongoose = require('mongoose');

    var Scan = require('../schemas/scanSchema');
    var PfsOverview = require('../schemas/pfsOverviewSchema');

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
            { $match: {
                    scanDate: {$gte: monthStart.toDate(), $lte: monthEnd.toDate()}
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
                { $match: {
                    $and: [
                        {scanDate: {$gte: monthStart.toDate()}},
                        {scanDate: {$lte: monthEnd.toDate()}}
                    ]
                }},
                { $sort: {scanDate: -1} },
                { $group: {
                    _id: "$domain",
                }},
                { $group: {
                    _id: null,
                    count: {$sum: 1}
                }}
            ]).allowDiskUse(true).exec(function(err, distinctHosts) {
                var countTotal = distinctHosts[0].count;
                var pfsOverview = new PfsOverview();
                pfsOverview.month = monthStart.year() + '_' + (monthStart.month()+1);
                pfsOverview.pfsEnabled = countEnabled;
                pfsOverview.pfsDisabled = countTotal - countEnabled;
                pfsOverview.total = countTotal;

                var plainData = pfsOverview.toObject();
                delete plainData._id;

                PfsOverview.findOneAndUpdate({month: pfsOverview.month}, plainData, {upsert:true}, function(err, doc){
                    if (err) { throw err; }
                    console.log('Aggregation done', scriptName);
                    if (standalone) { mongoose.disconnect(); }
                });
            });
        });
    };

    if (standalone) { startQuery(); }
    module.exports = { startQuery: startQuery };
}());
