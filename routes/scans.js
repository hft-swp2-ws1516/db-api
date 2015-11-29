(function () {
    'use strict';

    var router = require('express').Router();
    var Scan = require('../schemas/scanSchema');

    router.route('/')
        .get(function(req, res) {
            var page = req.query.page || 0;
            var itemsPerPage = 10;

            Scan.find().skip(itemsPerPage * page).limit(itemsPerPage).exec(function(err, scans) {
                if (err) { res.status(500).send(err); }
                res.status(200).json(scans);
                res.end();
            });
        });

    router.route('/:scanId')
        .get(function(req, res) {
            Scan.findById(req.params.scanId, function(err, scan) {
                if (err) { res.status(500).send(err); }
                res.status(200).json(scan);
                res.end();
            });
        });

    module.exports = router;
}());
