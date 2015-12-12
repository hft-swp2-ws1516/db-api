(function () {
    'use strict';

    var path = require('path');
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
                ciphers: {$first: "$ciphers" }
            }},
            // undwind every cipher
            { $unwind : "$ciphers" },
            // cosmetics
            { $project: {
                _id: 0,
                domain: "$_id",
                cipher: "$ciphers"
            }},
            // group by domain and mac
            { $group: {
                _id: {
                    domain: "$domain",
                    mac: "$cipher.mac"
                },
                count: {$sum: 1}
            }},
            // count the macs
            { $group: {
                _id: {
                    mac: "$_id.mac"
                },
                count: {$sum: 1}
            }},
            // cosmetics
            { $project: {
                _id: 0,
                mac: "$_id.mac",
                count: 1
            }},
            {
                $sort: {count: -1}
            }
        ]).allowDiskUse(true).exec(function(err, result) {
            var macDistribution = new MacDistribution();
            macDistribution.month = monthStart.year() + '_' + (monthStart.month()+1);
            macDistribution.distribution = result;

            var plainData = macDistribution.toObject();
            delete plainData._id;

            MacDistribution.findOneAndUpdate({month: macDistribution.month}, plainData, {upsert:true}, function(err, doc){
                if (err) { throw err; }
                console.log('Aggregation done', scriptName);
                if (standalone) { mongoose.disconnect(); }
            });
        });
    };

    if (standalone) { startQuery(); }
    module.exports = { startQuery: startQuery };
}());
