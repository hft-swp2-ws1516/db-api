(function () {
    'use strict';

    var path = require('path');
    var async = require('async');
    var moment = require('moment');
    var mongoose = require('mongoose');

    var Scan = require('../schemas/scanSchema');
    var MacDistribution = require('../schemas/macDistributionSchema');

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
                tld: {$first: "$tld" },
                ciphers: {$first: "$ciphers" }
            }},
            // undwind every cipher
            { $unwind : "$ciphers" },
            // cosmetics
            { $project: {
                _id: 0,
                domain: "$_id",
                tld: 1,
                cipher: "$ciphers"
            }},
            // group by domain and mac
            { $group: {
                _id: {
                    domain: "$domain",
                    mac: "$cipher.mac",
                },
                tld: {$first: "$tld" },
                count: {$sum: 1},
            }},
            // count the macs per tld
            { $group: {
                _id: {
                    mac: "$_id.mac",
                    tld: "$tld"
                },
                count: {$sum: "$count"}
            }},
            { $project: {
                _id: 0,
                mac: "$_id.mac",
                tld: "$_id.tld",
                count: 1,
            }},
            { $group: {
                _id: "$tld",
                distribution: {$push: "$$ROOT"}
            }},
            { $project: {
                tld: "$_id",
                _id: 0,
                distribution: 1
            }}
        ]).allowDiskUse(true).exec(function(err, result) {
            // "result" is an array containing the mac distribution for every tld
            var macDistributions = [];
            for (var i = 0; i < result.length; i++) {
                var currTldResult = result[i];
                var macDistribution = new MacDistribution();
                macDistribution.tld = currTldResult.tld;
                macDistribution.month = monthStart.year() + '_' + (monthStart.month()+1);
                macDistribution.distribution = currTldResult.distribution;
                macDistributions.push(macDistribution);
            }

            // for every collected cipher summary
            async.eachLimit(macDistributions, 10, function(macDistribution, callback){
                // search for the number of domains with this tld
                var countQuery = {
                    $and: [
                        {scanDate: {$gte: monthStart.toDate()}},
                        {scanDate: {$lte: monthEnd.toDate()}}
                    ],
                    tld: macDistribution.tld
                };

                // count the number of distinct domains in this tld
                Scan.find(countQuery).distinct('domain').count(function(err, count) {
                    // prepare the data which we want to insert
                    var plainData = macDistribution.toObject();
                    delete plainData._id;

                    // upsert all the collected cipher summaries
                    var upsertQuery = {month: macDistribution.month, tld: macDistribution.tld };
                    MacDistribution.findOneAndUpdate(upsertQuery, plainData, {upsert:true}, function(err, doc){
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
