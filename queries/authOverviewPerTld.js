(function () {
    'use strict';

    var path = require('path');
    var async = require('async');
    var moment = require('moment');
    var mongoose = require('mongoose');

    var Scan = require('../schemas/scanSchema');
    var AuthOverview = require('../schemas/authOverviewSchema');

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
            // match all scans in the current month which have export enabled
            { $match: {
                scanDate: {$gte: monthStart.toDate(), $lte: monthEnd.toDate()},
                ciphers: {$elemMatch: {
                    status: {$in: ["accepted", "preferred"]}
                }}
            }},
            // get the distinct, newest scan of every domain
            { $sort: {scanDate: -1} },
            { $group: {
                _id: "$domain",
                ciphers: {$first: "$ciphers" },
                tld: {$first: "$tld" }
            }},
            // unwind every cipher
            { $unwind : "$ciphers" },
            // cosmetics
            { $project: {
                _id: 0,
                domain: "$_id",
                tld: 1,
                cipher: 1,
                auth: "$ciphers.au"
            }},
            // group by domain and auth, so we get a object for every au of a domain
            { $group: {
                _id: {
                    domain: "$domain",
                    auth: "$auth"
                },
                tld: { $first: "$tld" },
            }},
            // group by tld and au, and count
            { $group: {
                _id: {
                    tld: "$tld",
                    auth: "$_id.auth"
                },
                count: { $sum: 1}
            }},
            // cosmetics
            { $project: {
                _id: 0,
                auth: "$_id.auth",
                tld: "$_id.tld",
                count: 1,
            }}
        ]).allowDiskUse(true).exec(function(err, result) {
            var authOverviews = [];
            var authTotals = {};
            for (var i = 0; i < result.length; i++) {
                var authOverview = new AuthOverview();
                authOverview.month = monthStart.year() + '_' + (monthStart.month()+1);
                authOverview.auth = result[i].auth;
                authOverview.tld = result[i].tld;
                authOverview.count = result[i].count;
                authOverviews.push(authOverview);
            }

            async.eachLimit(authOverviews, 10, function(authOverview, callback){
                // get plain data, which we will insert into mongo
                var plainData = authOverview.toObject();
                delete plainData._id;

                // save the aggregated data to mongo
                var upsertQuery = {month: authOverview.month, tld: authOverview.tld, auth: authOverview.auth};
                AuthOverview.findOneAndUpdate(upsertQuery, plainData, {upsert:true}, function(err, doc){
                    callback();
                });
            }, function(){
                if (err) { throw err; }
                console.log('Aggregation done', scriptName);
                if (standalone) { mongoose.disconnect(); }
            });
        });
    };

    if (standalone) { startQuery(); }
    module.exports = { startQuery: startQuery };
}());
