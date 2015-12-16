(function () {
    'use strict';

    var path = require('path');
    var async = require('async');
    var moment = require('moment');
    var mongoose = require('mongoose');

    var Scan = require('../schemas/scanSchema');
    var PfsDistribution = require('../schemas/pfsDistributionSchema');

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
                ciphers: {$first: "$ciphers" },
                tld: {$first: "$tld" }
            }},
            // unwind every cipher
            { $unwind : "$ciphers" },
            // cosmetics
            { $project: {
                _id: 0,
                tld: 1,
                domain: "$_id",
                cipher: "$ciphers"
            }},
            // match     every pfs enabled cipher
            { $match: {
                $or: [{"cipher.kx": "ECDH"}, {"cipher.kx": "DH"}]
            }},
            // group by domain, kx and strenght
            { $group: {
                _id: {
                    domain: "$domain",
                    kx: "$cipher.kx",
                    kxStrength: "$cipher.kxStrength"
                },
                tld: {$first: "$tld" },
                count: {$sum: 1}
            }},
            // now count per kx & strenght
            { $group: {
                _id: {
                    tld: "$tld",
                    kx: "$_id.kx",
                    kxStrength: "$_id.kxStrength"
                },
                count: {$sum: 1}
            }},
            // cosmetics
            { $project: {
                _id: 0,
                tld: "$_id.tld",
                kx: "$_id.kx",
                kxStrength: "$_id.kxStrength",
                count: 1
            }},
            // group by tld
            { $group: {
                _id: "$tld",
                distribution: {$push: "$$ROOT"}
            }},
            // cosmetics
            { $project: {
                _id: 0,
                tld: "$_id",
                distribution: 1
            }},
            {
                $sort: {count: -1}
            }
        ]).allowDiskUse(true).exec(function(err, result) {
            var pfsDistributions = [];
            for (var i = 0; i < result.length; i++) {
                var currTldResult = result[i];
                var pfsDistribution = new PfsDistribution();
                pfsDistribution.tld = currTldResult.tld;
                pfsDistribution.month = monthStart.year() + '_' + (monthStart.month()+1);
                pfsDistribution.distribution = currTldResult.distribution;
                pfsDistributions.push(pfsDistribution);
            }

            // for every collected cipher summary
            async.eachLimit(pfsDistributions, 10, function(pfsDistribution, callback){
                // search for the number of domains with this tld
                var countQuery = {
                    $and: [
                        {scanDate: {$gte: monthStart.toDate()}},
                        {scanDate: {$lte: monthEnd.toDate()}}
                    ],
                    tld: pfsDistribution.tld
                };

                // count the number of distinct domains in this tld
                Scan.find(countQuery).distinct('domain').count(function(err, count) {
                    // prepare the data which we want to insert
                    var plainData = pfsDistribution.toObject();
                    plainData.totalHosts = count;
                    delete plainData._id;
                    delete plainData.id;

                    // upsert all the collected cipher summaries
                    var updateQuery = {month: pfsDistribution.month, tld: pfsDistribution.tld };
                    PfsDistribution.findOneAndUpdate(updateQuery, plainData, {upsert: true, new: true}, function(err, doc) {
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
