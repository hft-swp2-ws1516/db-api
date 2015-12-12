(function () {
    'use strict';

    var path = require('path');
    var moment = require('moment');
    var mongoose = require('mongoose');

    var Scan = require('../schemas/scanSchema');
    var ExpOverview = require('../schemas/expOverviewSchema');

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
            // match all scans in the current month which have export enabled
            { $match: {
                scanDate: {$gte: monthStart.toDate(), $lte: monthEnd.toDate()},
                ciphers: {$elemMatch: {
                    export: true,
                    status: {$in: ["accepted", "preferred"]}
                }}
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
            // group by domain
            { $group: {
                _id: "$domain",
            }},
            // just count the result
            { $group: {
                _id: null,
                count: {$sum: 1}
            }}
        ]).allowDiskUse(true).exec(function(err, result) {
            var countEnabled = result[0].count;
            console.log(countEnabled);

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
                // prepare a ExpOverview object
                var countTotal = distinctHosts[0].count;
                var expOverview = new ExpOverview();
                expOverview.month = monthStart.year() + '_' + (monthStart.month()+1);
                expOverview.expEnabled = countEnabled;
                expOverview.expDisabled = countTotal - countEnabled;
                expOverview.total = countTotal;

                // get plain data, which we will insert into mongo
                var plainData = expOverview.toObject();
                delete plainData._id;

                // save the aggregated data to mongo
                ExpOverview.findOneAndUpdate({month: expOverview.month}, plainData, {upsert:true}, function(err, doc){
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
