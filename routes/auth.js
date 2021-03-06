(function () {
    'use strict';
    var router = require('express').Router();
    var AuthOverview = require('../schemas/authOverviewSchema');

    var TLD_UNSPECIFIED = "__all";

    router.route('/overview')
        .get(function(req, res, next) {

            var query = {
                tld: req.query.tld || TLD_UNSPECIFIED
            };

            AuthOverview.aggregate([
                { $match: query },
                { $group: {
                    _id: "$month",
                    auths: {$push: "$$ROOT"}
                }},
                { $project: {
                    month: "$_id",
                    _id: 0,
                    auths: 1
                }}
            ]).exec(function(err, result){
                if (err) { res.status(500).send(err); }
                res.status(200).json(result);
                res.end();
            });
        });

    module.exports = router;
}());
