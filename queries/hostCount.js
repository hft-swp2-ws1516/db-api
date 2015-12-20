(function () {
    'use strict';

    var path = require('path');
    var async = require('async');
    var moment = require('moment');
    var mongoose = require('mongoose');

    var Scan = require('../schemas/scanSchema');
    var HostCount = require('../schemas/hostCountSchema');

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

        // current month start and end
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
            // group and count by tld
            { $group: {
                _id: "$tld",
                totalHosts: {$sum: 1}
            }},
            // order by totalHosts
            { $sort: {
                totalHosts: -1
            }}
        ]).allowDiskUse(true).exec(function(err, result) {
            // prepare tld specific hostcount objects
            var hostCounts = [];
            var totalHosts = 0;
            for (var i = 0; i < result.length; i++) {
                var hostCount = new HostCount();
                hostCount.month = monthStart.year() + '_' + (monthStart.month()+1);
                hostCount.tld = result[i]._id;
                hostCount.hostCount = result[i].totalHosts;
                totalHosts += hostCount.hostCount;
                hostCounts.push(hostCount);
            }

            // for each collect host count object
            async.eachLimit(hostCounts, 10, function(hostCount, callback){
                // prepare the data which we want to insert
                var plainData = hostCount.toObject();
                delete plainData._id;

                // upsert all the collected cipher summaries
                var upsertQuery = {month: hostCount.month, tld: hostCount.tld };
                HostCount.findOneAndUpdate(upsertQuery, plainData, {upsert:true}, function(err, doc){
                    if (err) { throw err; }
                    callback();
                });
            }, function(err) {
                // now all tld specific host counts are inserted
                // after that we insert a host count object which is not specific to a tld
                var totalHostCount = new HostCount();
                totalHostCount.month = monthStart.year() + '_' + (monthStart.month()+1);
                totalHostCount.tld = TLD_UNSPECIFIED;
                totalHostCount.hostCount = totalHosts;

                // prepare the data which we want to insert
                var plainData = totalHostCount.toObject();
                delete plainData._id;

                // upsert the totalHosts object
                var upsertQuery = {month: totalHostCount.month, tld: totalHostCount.tld };
                HostCount.findOneAndUpdate(upsertQuery, plainData, {upsert:true}, function(err, doc){
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
