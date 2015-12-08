(function () {
    'use strict';
    var router = require('express').Router();
    var MacDistribution = require('../schemas/macDistributionSchema');

    router.route('/distribution')
        .get(function(req, res, next) {
            MacDistribution.find().exec(function(err, result){
                if (err) { res.status(500).send(err); }
                res.status(200).json(result);
                res.end();
            });
        });

    module.exports = router;
}());
