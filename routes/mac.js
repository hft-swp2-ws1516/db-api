(function () {
    'use strict';
    var router = require('express').Router();
    var MacDistribution = require('../schemas/macDistributionSchema');

    var TLD_UNSPECIFIED = "__all";

    router.route('/distribution')
        .get(function(req, res, next) {

            var query = {
                tld: req.query.tld || TLD_UNSPECIFIED
            };

            MacDistribution.find(query).exec(function(err, result){
                if (err) { res.status(500).send(err); }
                res.status(200).json(result);
                res.end();
            });
        });

    module.exports = router;
}());
