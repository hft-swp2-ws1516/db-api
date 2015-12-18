(function() {
    'use strict';
    
    var router = require('express').Router();
    var KeysizeSummary = require('../schemas/keysizeSummarySchema');
    var keysizeTLD = require('../schemas/keysizeTLDSchema');
    
    var TLD_UNSPECIFIED = "__all";
    
    router.route('/tld').get(function(req, res, next) {
	// TODO: unspecific does not work, can't find out yet why
	var query = {
                tld: req.query.tld || TLD_UNSPECIFIED
            };
	
	keysizeTLD.find(query).exec(function(err, result) {
	    if (err) { res.status(500).send(err); }
	    res.status(200).json(result);
	    res.end();
	});
    });
    
    router.route('/overview').get(function(req, res, next) {
	KeysizeSummary.find().exec(function(err, result) {
	    if (err) {
		res.status(500).send(err);
	    }
	    res.status(200).json(result);
	    res.end();
	});
    });
    
    
    module.exports = router;
}());