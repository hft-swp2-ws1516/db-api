/*jshint loopfunc: true */
(function() {
    'use strict';

    var path = require('path');
    var async = require('async');
    var moment = require('moment');
    var mongoose = require('mongoose');

    var Scan = require('../schemas/scanSchema');
    var KeysizeSummary = require('../schemas/keysizeSummarySchema');

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
	    {$match: { scanError: false}}, // we are interested in Scans without Errors
	    {$match: {scanDate: {$gte: monthStart.toDate(), $lte: monthEnd.toDate()}}}, // our scan range
	    {$sort: {scanDate: -1} },
	    {$group: { "_id": "$certificate.publicKeyLength", 
		       "totalAmount": {$sum: 1}}}
	]).allowDiskUse(true).exec(function(err, result) {
	    var keySummaries = [];
	    for (var i = 0; i < result.length; i++) {
		// filling a list with results using KeysizeSummarySchema
		var kz = new KeysizeSummary();
		kz.month = monthStart.year() + '_' + (monthStart.month()+1);
		kz.publicKeyLength = result[i]._id; 
		kz.totalAmount = result[i].totalAmount;
		keySummaries.push(kz)
	    }
	    
	    var tasksAtAtime = 10;
	    /**
	     * Iterate over summaries and perform a task for each item. In this 
	     * case we update the collection with our new aggregated results.
	     */
            async.eachLimit(keySummaries , tasksAtAtime, function(kz, callback) {
		var plainData = kz.toObject();
		delete plainData._id; // deleting id to avoid errors
                delete plainData.id;
                var updateQuery = {month: kz.month, publicKeyLength: kz.publicKeyLength};
		KeysizeSummary.findOneAndUpdate(updateQuery, 
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