(function () {
    'use strict';
    var router = require('express').Router();
    var apicache = require('apicache').options({ debug: true }).middleware;

    // create model
    var Scan = require('../schemas/scanSchema');

    router.route('/summary')
        .get(apicache('5 minutes'), function(req, res, next) {
            Scan.aggregate([
                { $sort: {scanDate: -1} },
                { $group: {
                    _id: "$domain",
                    ciphers: {$first: "$ciphers" }
                }},
                { $unwind : "$ciphers" },
                { $group: {
                    _id: {
                        cipher: "$ciphers.cipher",
                        protocol: "$ciphers.protocol",
                        status: "$ciphers.status"
                    },
                    count: {$sum: 1}
                }},
                {
                    $project: {
                        _id: 0,
                        cipher: "$_id.cipher",
                        protocol: "$_id.protocol",
                        status: "$_id.status",
                        count: 1
                    }
                },
                {
                    $sort: {count: -1}
                }
            ]).allowDiskUse(true).exec(function(err, result) {
                res.status(200).json(result);
                res.end();
            });
        });

    module.exports = router;
}());
