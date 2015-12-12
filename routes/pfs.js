(function () {
    'use strict';
    var router = require('express').Router();
    var PfsDistribution = require('../schemas/pfsDistributionSchema');
    var PfsOverview = require('../schemas/pfsOverviewSchema');

    var TLD_UNSPECIFIED = "__all";

    router.route('/distribution')
        .get(function(req, res, next) {
            PfsDistribution.find().exec(function(err, result){
                if (err) { res.status(500).send(err); }
                res.status(200).json(result);
                res.end();
            });
        });

    router.route('/overview')
        .get(function(req, res, next) {

            PfsOverview.aggregate([
                { $group: {
                    _id: "$month",
                    overviews: {$push: "$$ROOT"},
                    monthlyTotalHosts: {$sum: "$total"},
                    monthlyPfsEnabled: {$sum: "$pfsEnabled"},
                    monthlyPfsDisabled: {$sum: "$pfsDisabled"}
                }},
                { $project: {
                    month: "$_id",
                    overviews: 1,
                    monthlyTotalHosts: 1,
                    monthlyPfsEnabled: 1,
                    monthlyPfsDisabled: 1
                }}
            ]).exec(function(err, result) {
                if (err) { res.status(500).send(err); }
                res.status(200).json(result);
                res.end();
            });
        });

    module.exports = router;
}());
