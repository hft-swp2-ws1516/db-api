(function () {
    'use strict';
    var router = require('express').Router();
    var ExpOverview = require('../schemas/expOverviewSchema');

    router.route('/overview')
        .get(function(req, res, next) {
            ExpOverview.find().exec(function(err, result){
                if (err) { res.status(500).send(err); }
                res.status(200).json(result);
                res.end();
            });
        });

    module.exports = router;
}());
