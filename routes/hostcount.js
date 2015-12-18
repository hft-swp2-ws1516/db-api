(function () {
    'use strict';

    var router = require('express').Router();
    var HostCount = require('../schemas/hostCountSchema');

    var TLD_UNSPECIFIED = "__all";

    router.route('/')
        .get(function(req, res, next) {

            var query = {
                tld: req.query.tld || TLD_UNSPECIFIED
            };

            HostCount.find(query).exec(function(err, result){
                if (err) { res.status(500).send(err); }
                res.status(200).json(result);
                res.end();
            });
        });
    module.exports = router;
}());
