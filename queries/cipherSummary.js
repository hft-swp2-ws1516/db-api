(function () {
    'use strict';

    var path = require('path');
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

        // current month start and ends
        var monthStart = moment().set({'date': 1, 'hour': 0, 'minute': 0, 'second': 1, 'millisecond': 0});
        var monthEnd = moment(monthStart);
        monthEnd = monthEnd.add(1, 'months').subtract(2, 'seconds');

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
                ciphers: {$first: "$ciphers" }
            }},
            { $unwind : "$ciphers" },
            { $group: {
                _id: {
                    cipher: "$ciphers.cipher",
                    protocol: "$ciphers.protocol",
                    status: "$ciphers.status"
                },
                count: {$sum: 1}
            }},
            {
                $project: {
                    _id: 0,
                    cipher: "$_id.cipher",
                    protocol: "$_id.protocol",
                    status: "$_id.status",
                    count: 1
                }
            },
            {
                $sort: {count: -1}
            }
        ]).allowDiskUse(true).exec(function(err, result) {
            var cipherSummary = new CipherSummary();
            cipherSummary.month = monthStart.year() + '_' + (monthStart.month()+1);
            cipherSummary.tld = null;
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

                CipherSummary.findOneAndUpdate({month: cipherSummary.month}, plainData, {upsert:true}, function(err, doc) {
                    if (err) { throw err; }
                    console.log('done');
                    if (standalone) { mongoose.disconnect(); }
                });
            });
        });
    };

    if (standalone) { startQuery(); }
    module.exports = { startQuery: startQuery };
}());
