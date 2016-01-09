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
            // match all documents in the current month
            { $match: {
                scanDate: {$gte: monthStart.toDate(), $lte: monthEnd.toDate()}
            }},
            // get the distinct, newest scan of every domain
            { $sort: {scanDate: -1} },
            { $group: {
                _id: "$domain",
                ciphers: { $first: "$ciphers" },
                tld: { $first: "$tld" },
            }},
            // unwind every cipher
            { $unwind : "$ciphers" },
            // cosmetics
            { $project: {
                _id: 0,
                domain: "$_id",
                cipher: "$ciphers",
                tld: "$tld"
            }},
            // match only these ciphers, where PFS is supported
            { $match: {
                "cipher.ephemeral": true
            }},
            // group the ciphers back by there domain
            { $group: {
                _id: "$domain",
                tld: {$first: "$tld" },
            }},
            // count for each tld, how many domains support pfs
            { $group: {
                _id: "$tld",
                count: { $sum: 1 }
            }}
        ]).allowDiskUse(true).exec(function(err, result) {
            // now count the total hosts for every tld
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
                    // extract number of host with the current tld which have pfs enabled
                    var pfsEnabled = tld.count;

                    // extract the total hosts in the current tld
                    var totalHosts = totalHostCount[0].count;

                    // prepare a pfsOverview object
                    var pfsOverview = new PfsOverview();
                    pfsOverview.month = monthStart.year() + '_' + (monthStart.month()+1);
                    pfsOverview.tld = tld._id;
                    pfsOverview.pfsEnabled = pfsEnabled;
                    pfsOverview.totalHosts = totalHosts;
                    pfsOverview.pfsDisabled = pfsOverview.totalHosts - pfsOverview.pfsEnabled;

                    // get plain data, which we will insert into mongo
                    var plainData = pfsOverview.toObject();
                    delete plainData._id;

                    // save the aggregated data to mongo
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
