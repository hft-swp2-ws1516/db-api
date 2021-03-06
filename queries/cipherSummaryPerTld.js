/*jshint loopfunc: true */
(function () {
    'use strict';

    var path = require('path');
    var async = require('async');
    var moment = require('moment');
    var mongoose = require('mongoose');

    var Scan = require('../schemas/scanSchema');
    var CipherSummary = require('../schemas/cipherSummarySchema');

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
            // only match these scans from the current month, matching the top level domain
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
            // unwind every cipher
            { $unwind : "$ciphers" },
            // group by tld, cipher, protocol, status
            { $group: {
                _id: {
                    tld: "$tld",
                    cipher: "$ciphers.cipher",
                    protocol: "$ciphers.protocol",
                    status: "$ciphers.status"
                },
                count: {$sum: 1}
            }},
            // cosmetics
            {
                $project: {
                    _id: 0,
                    tld: "$_id.tld",
                    cipher: "$_id.cipher",
                    protocol: "$_id.protocol",
                    status: "$_id.status",
                    count: 1
                }
            },
            // collect every cipher per tld
            { $group: {
                _id: "$tld",
                ciphers: { $push: "$$ROOT"}
            }},
            { $project: {
                _id: 0,
                tld: "$_id",
                ciphers: 1
            }},
            {
                $sort: {count: -1}
            }
        ]).allowDiskUse(true).exec(function(err, result) {
            console.log("got documents for", result.length, "tlds");
            var cipherSummaries = [];
            for (var i = 0; i < result.length; i++) {
                var currTldResult = result[i];
                var cipherSummary = new CipherSummary();
                cipherSummary.tld = currTldResult.tld;
                cipherSummary.month = monthStart.year() + '_' + (monthStart.month()+1);
                cipherSummary.summary = currTldResult.ciphers;
                cipherSummaries.push(cipherSummary);
            }

            // for every collected cipher summary
            async.eachLimit(cipherSummaries, 10, function(cipherSummary, callback){
                // search for the number of domains with this tld
                var countQuery = {
                    $and: [
                        {scanDate: {$gte: monthStart.toDate()}},
                        {scanDate: {$lte: monthEnd.toDate()}}
                    ],
                    tld: cipherSummary.tld
                };

                // count the number of distinct domains in this tld
                Scan.find(countQuery).distinct('domain').count(function(err, count) {
                    // prepare the data which we want to insert
                    var plainData = cipherSummary.toObject();
                    plainData.totalHosts = count;
                    delete plainData._id;
                    delete plainData.id;

                    // upsert all the collected cipher summaries
                    var updateQuery = {month: cipherSummary.month, tld: cipherSummary.tld };
                    CipherSummary.findOneAndUpdate(updateQuery, plainData, {upsert: true, new: true}, function(err, doc) {
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
