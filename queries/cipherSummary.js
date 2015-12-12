(function () {
    'use strict';

    var path = require('path');
    var moment = require('moment');
    var mongoose = require('mongoose');

    var Scan = require('../schemas/scanSchema');
    var CipherSummary = require('../schemas/cipherSummarySchema');

    var TLD_UNSPECIFIED = "__all";

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
            // get the distinct, newest of every domain
            { $sort: {scanDate: -1} },
            { $group: {
                _id: "$domain",
                ciphers: {$first: "$ciphers" }
            }},
            // unwind every cipher
            { $unwind : "$ciphers" },
            // group by cipher, protocol and status
            { $group: {
                _id: {
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
                    cipher: "$_id.cipher",
                    protocol: "$_id.protocol",
                    status: "$_id.status",
                    count: 1
                }
            },
            // sort desc by the count field
            {
                $sort: {count: -1}
            }
        ]).allowDiskUse(true).exec(function(err, result) {
            // prepare CipherSummary object
            var cipherSummary = new CipherSummary();
            cipherSummary.month = monthStart.year() + '_' + (monthStart.month()+1);
            cipherSummary.tld = TLD_UNSPECIFIED;
            cipherSummary.summary = result;

            // search for the number of all distinct domains
            var countQuery = {
                $and: [
                    {scanDate: {$gte: monthStart.toDate()}},
                    {scanDate: {$lte: monthEnd.toDate()}}
                ]
            };

            Scan.find(countQuery).distinct('domain').count(function(err, count) {
                // prepare the data which we want to insert
                var plainData = cipherSummary.toObject();
                plainData.totalHosts = count;
                delete plainData._id;
                delete plainData.id;

                // save the aggregated data to mongo
                var upsertQuery = { month: cipherSummary.month, tld: TLD_UNSPECIFIED };
                CipherSummary.findOneAndUpdate(upsertQuery, plainData, {upsert:true}, function(err, doc) {
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
