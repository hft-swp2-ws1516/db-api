(function () {
    'use strict';
    var router = require('express').Router();
    var CipherSummary = require('../schemas/cipherSummarySchema');

    router.route('/summary')
        .get(function(req, res, next) {
            CipherSummary.find(function(err, result){
                res.status(200).json(result);
                res.end();
            });
        });
    module.exports = router;
}());
