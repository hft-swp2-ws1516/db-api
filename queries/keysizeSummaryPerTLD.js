/*jshint loopfunc: true */
(function() {
    'use strict';
    
    var path = require('path');
    var async = require('async');
    var moment = require('moment');
    var mongoose = require('mongoose');
    
    var Scan = require('../schemas/scanSchema');
    var KeysizeTLD = require('../schemas/keysizeTLDSchema');
    
    // running as module or standalone?
    var standalone = !module.parent;
    var scriptName = path.basename(module.filename, path.extname(module.filename));
    
    // main function
    var startQuery = function() {
        if (mongoose.connection.readyState === 0) {
            mongoose.connect('mongodb://localhost:27017/tls');
        }
        console.log('Aggregator started:', scriptName);
        // create the scan range (current month)
        var monthStart = moment().set({'date': 1, 'hour': 0, 'minute': 0, 'second': 1, 'millisecond': 0});
        var monthEnd = moment(monthStart);
        monthEnd = monthEnd.add(1, 'months').subtract(2, 'seconds');
        
        // start aggregating the data
        Scan.aggregate([
            {$match: {scanError: false}}, // we are interested in Scans without Errors
            {$match: {scanDate: {$gte: monthStart.toDate(), $lte: monthEnd.toDate()}}}, // our scan range
            // get the distinct, newest scan of every domain
            {$sort: {scanDate: -1}},
            {$group: {
                _id: "$domain",
                tld: {$first: "$tld"},
                keyLength: {$first: "$certificate.publicKeyLength"}
                }
            },
            {$group: {
                _id: {
                    tld: "$tld",
                    publicKeyLength: "$keyLength" 
                },
                totalAmount: {$sum: 1}
            }},
            {$project: {
                _id: 0,
            tld: "$_id.tld",
            publicKeyLength: "$_id.publicKeyLength",
            totalAmount: "$totalAmount"
            }},
            { $group: {
                _id: "$tld",
                keySummary: { $push: "$$ROOT"}
            }},
            { $project: {
                _id: 0,
                tld: "$_id",
                keySummary: 1
            }}
        ]).allowDiskUse(true).exec(function(err, result) {
            // console.log(result)
            var keysizeTLDcollection = [];
            for (var i = 0; i < result.length; i++) {
                // filling a list with results using KeysizeTLDSchema
                var keysizeTLD = new KeysizeTLD();
                keysizeTLD.tld = result[i].tld;
                keysizeTLD.month = monthStart.year() + '_' + (monthStart.month()+1);
                keysizeTLD.sumTLD = result[i].keySummary;
                keysizeTLDcollection.push(keysizeTLD)
            }
            
            var tasksAtAtime = 10;
            /**
             * Iterate over summaries and perform a task for each item. In this 
             * case we update the collection with our new aggregated results.
             */
            async.eachLimit(keysizeTLDcollection , tasksAtAtime, function(keysizeTLD, callback) {
                var plainData = keysizeTLD.toObject();
                delete plainData._id; // deleting id to avoid errors
                delete plainData.id;
                var updateQuery = {month: keysizeTLD.month, tld: keysizeTLD.tld};
                KeysizeTLD.findOneAndUpdate(updateQuery,
                        plainData, 
                        {upsert: true, new: true}, 
                        function(err, doc) {
                            if (err) { throw err; }
                            callback();
                        });
            }, function(err) {
                console.log('Aggregation done', scriptName);
                if (standalone) { mongoose.disconnect(); }
            });
        });
    };
    
    if (standalone) {
        startQuery();
    }
    module.exports = {
            startQuery : startQuery
    };
}());
