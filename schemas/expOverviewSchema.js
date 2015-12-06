(function () {
    'use strict';

    var mongoose = require('mongoose');

    // create mongodb schema for our news
    var schema = new mongoose.Schema({
        month: String,
        expEnabled: Number,
        expDisabled: Number,
        total: Number
    }, {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    });

    module.exports = mongoose.model('ExpOverview', schema);
}());