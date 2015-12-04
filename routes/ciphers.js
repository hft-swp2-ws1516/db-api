(function () {
    'use strict';

    var router = require('express').Router();
    var CipherSummary = require('../schemas/cipherSummarySchema');

    var TLD_UNSPECIFIED = "__all";

    router.route('/summary')
        .get(function(req, res, next) {

            var tld = req.query.tld || TLD_UNSPECIFIED;
            var query = {
                tld: tld
            };

            CipherSummary.find(query).exec(function(err, result){
                if (err) { res.status(500).send(err); }
                res.status(200).json(result);
                res.end();
            });
        });
    module.exports = router;
}());
