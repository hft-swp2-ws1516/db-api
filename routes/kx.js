(function () {
    'use strict';
    var router = require('express').Router();
    var KxOverview = require('../schemas/kxOverviewSchema');

    var TLD_UNSPECIFIED = "__all";

    router.route('/overview')
        .get(function(req, res, next) {

            var query = {
                tld: req.query.tld || TLD_UNSPECIFIED
            };

            KxOverview.aggregate([
                { $match: query },
                { $group: {
                    _id: "$month",
                    kxs: {$push: "$$ROOT"}
                }},
                { $project: {
                    month: "$_id",
                    _id: 0,
                    kxs: 1
                }}
            ]).exec(function(err, result){
                if (err) { res.status(500).send(err); }
                res.status(200).json(result);
                res.end();
            });
        });

    module.exports = router;
}());
