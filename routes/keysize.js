(function () {
    'use strict';
    var router = require('express').Router();
    var KeysizeSummary = require('../schemas/keysizeSummarySchema');

    router.route('/keysize')
        .get(function(req, res, next) {
        	KeysizeSummary.find().exec(function(err, result){
                if (err) { res.status(500).send(err); }
                res.status(200).json(result);
                res.end();
            });
        });
    module.exports = router;
}());
