'use strict';

// import the express router
var router = require('express').Router();
// create model
var TLSModel = require('../tlsSchema');


// route /news
router.route('/')

    // GET
    .get(function(req, res) {

        // db query
        TLSModel.find().limit(50).exec(function(err, entries) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(entries);
            res.end();
        });
    });


// route /news/:tls_id
router.route('/:tls_id')

    // get item by id
    .get(function(req, res) {
        TLSModel.findById(req.params.tls_id, function(err, entry) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(entry);
            res.end();
        });
    });


module.exports = router;
