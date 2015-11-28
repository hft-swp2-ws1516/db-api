(function () {
    'use strict';
    var router = require('express').Router();
    var apicache = require('apicache').options({ debug: true }).middleware;

    // create model
    var Scan = require('../schemas/scanSchema');

    router.route('/distribution')
        .get(apicache('5 minutes'), function(req, res, next) {
            Scan.aggregate([
                { $sort: {scanDate: -1} },
                { $group: {
                    _id: "$domain",
                    ciphers: {$first: "$ciphers" }
                }},
                { $unwind : "$ciphers" },
                { $project: {
                    _id: 0,
                    domain: "$_id",
                    cipher: "$ciphers"
                }},
                { $match: {
                    $or: [{"cipher.kx": "ECDH"}, {"cipher.kx": "DH"}]
                }},
                { $group: {
                    _id: {
                        domain: "$domain",
                        kx: "$cipher.kx",
                        kxStrenght: "$cipher.kxStrenght"
                    },
                    count: {$sum: 1}
                }},
                { $group: {
                    _id: {
                        kx: "$_id.kx",
                        kxStrenght: "$_id.kxStrenght"
                    },
                    count: {$sum: 1}
                }},
                { $project: {
                    _id: 0,
                    kx: "$_id.kx",
                    kxStrenght: "$_id.kxStrenght",
                    count: 1
                }},
                {
                    $sort: {count: -1}
                }
            ]).allowDiskUse(true).exec(function(err, result) {
                res.status(200).json(result);
                res.end();
            });
        });

    router.route('/overview')
        .get(apicache('0 minutes'), function(req, res, next) {
            // count all hosts with enabled pfs
            Scan.aggregate([
                { $sort: {scanDate: -1} },
                { $group: {
                    _id: "$domain",
                    ciphers: {$first: "$ciphers" }
                }},
                { $unwind : "$ciphers" },
                { $project: {
                    _id: 0,
                    domain: "$_id",
                    cipher: "$ciphers"
                }},
                { $match: {
                    $or: [{"cipher.kx": "ECDH"}, {"cipher.kx": "DH"}]
                }},
                { $group: {
                    _id: "$domain",
                }},
                { $group: {
                    _id: null,
                    count: {$sum: 1}
                }}
            ]).allowDiskUse(true).exec(function(err, result) {
                var countEnabled = result[0].count;
                console.log("enabled", result);

                // count total distinct number of hosts
                Scan.aggregate([
                    { $sort: {scanDate: -1} },
                    { $group: {
                        _id: "$domain",
                    }},
                    { $group: {
                        _id: null,
                        count: {$sum: 1}
                    }}
                ]).allowDiskUse(true).exec(function(err, distinctHosts) {
                    var countTotal = distinctHosts[0].count;
                    res.status(200).json({
                        pfsEnabled: countEnabled,
                        pfsDisabled: countTotal - countEnabled,
                        total: countTotal
                    });
                    res.end();
                });
            });
        });

    module.exports = router;
}());
