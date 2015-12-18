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
	var scriptName = path.basename(module.filename, path
			.extname(module.filename));

	// main function
	var startQuery = function() {
		
		if (mongoose.connection.readyState === 0) {
			mongoose.connect('mongodb://localhost:27017/tls');
		}
		
		console.log('Aggregator started:', scriptName);
		
		Scan.aggregate([
		                {$match: { scanError: false}},
		                {$group: { "_id": "$certificate.publicKeyLength", "totalAmount": {$sum: 1}}}
		                ]
		).allowDiskUse(true).exec(function(err, result) {
//			console.log(result.length)
			var keySummaries = [];
			for (var i = 0; i < result.length; i++) {
				var kz = new KeysizeSummary();
				kz.publicKeyLength = result[i]._id; 
				kz.totalAmount = result[i].totalAmount;
				keySummaries.push(kz)
			}
			
			// for every collected cipher summary
            async.eachLimit(keySummaries , result.length, function(kz, callback) {
//				console.log(kz)
				var plainData = kz.toObject();
				delete plainData._id;
                delete plainData.id;
                
				var updateQuery = {publicKeyLength: kz.publicKeyLength};
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