(function () {
    'use strict';
    var router = require('express').Router();
    var PfsDistribution = require('../schemas/pfsDistributionSchema');
    var PfsOverview = require('../schemas/pfsOverviewSchema');

    router.route('/distribution')
        .get(function(req, res, next) {
            PfsDistribution.find().then(function(err, result) {
                if (err) { res.status(500).send(err); }
                res.status(200).json(result);
                res.end();
            });
        });

    router.route('/overview')
        .get(function(req, res, next) {
            PfsOverview.find().then(function(err, result) {
                if (err) { res.status(500).send(err); }
                res.status(200).json(result);
                res.end();
            });
        });

    module.exports = router;
}());
