(function () {
    'use strict';

    var path = require('path');
    var async = require('async');
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
                ciphers: { $first: "$ciphers" },
                tld: { $first: "$tld" },
            }},
            { $unwind : "$ciphers" },
            { $project: {
                _id: 0,
                domain: "$_id",
                cipher: "$ciphers",
                tld: "$tld"
            }},
            { $match: {
                $or: [{"cipher.kx": "ECDH"}, {"cipher.kx": "DH"}]
            }},
            { $group: {
                _id: "$domain",
                tld: {$first: "$tld" },
            }},
            { $group: {
                _id: "$tld",
                count: { $sum: 1 }
            }}
        ]).allowDiskUse(true).exec(function(err, result) {

            // count total hosts for every tld
            async.eachLimit(result, 10, function(tld, callback){
                Scan.aggregate([
                    // only match these scans from the current month, matching the top level domain
                    { $match: {
                        scanDate: {$gte: monthStart.toDate(), $lte: monthEnd.toDate()},
                        tld: tld._id
                    }},
                    // group by domain, so we have every host only one time
                    { $group: {
                        _id: "$domain"
                    }},
                    // just count the result (our number of hosts matching this top level domain)
                    { $group: {
                        _id: null,
                        count: {$sum: 1}
                    }}
                ]).allowDiskUse(true).exec(function(err, totalHostCount) {
                    console.log(tld, totalHostCount);

                    var pfsOverview = new PfsOverview();
                    pfsOverview.month = monthStart.year() + '_' + (monthStart.month()+1);
                    pfsOverview.tld = tld._id;
                    pfsOverview.pfsEnabled = tld.count;
                    pfsOverview.pfsDisabled = totalHostCount.count - pfsOverview.pfsEnabled;
                    pfsOverview.total = totalHostCount.count;

                    var plainData = pfsOverview.toObject();
                    delete plainData._id;
                    delete plainData.id;

                    var upsertQuery = {month: pfsOverview.month, tld: pfsOverview.tld };
                    PfsOverview.findOneAndUpdate(upsertQuery, plainData, {upsert:true}, function(err, doc){
                        if (err) { throw err; }
                        callback();
                    });
                });
            }, function(err) {
                console.log('Aggregation done', scriptName);
                if (standalone) { mongoose.disconnect(); }
            });
        });
    };

    if (standalone) { startQuery(); }
    module.exports = { startQuery: startQuery };
}());
