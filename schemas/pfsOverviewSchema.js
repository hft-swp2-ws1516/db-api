(function () {
    'use strict';

    var mongoose = require('mongoose');

    // create mongodb schema for our news
    var schema = new mongoose.Schema({
        month: String,
        tld: String,
        pfsEnabled: Number,
        pfsDisabled: Number,
        total: Number
    }, {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    });

    module.exports = mongoose.model('PfsOverview', schema);
}());
