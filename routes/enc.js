(function () {
    'use strict';
    var router = require('express').Router();
    var EncOverview = require('../schemas/encOverviewSchema');

    var TLD_UNSPECIFIED = "__all";

    router.route('/overview')
        .get(function(req, res, next) {

            var query = {
                tld: req.query.tld || TLD_UNSPECIFIED
            };

            EncOverview.aggregate([
                { $match: query },
                { $group: {
                    _id: "$month",
                    encs: {$push: "$$ROOT"}
                }}
            ]).exec(function(err, result){
                if (err) { res.status(500).send(err); }
                res.status(200).json(result);
                res.end();
            });
        });

    module.exports = router;
}());
