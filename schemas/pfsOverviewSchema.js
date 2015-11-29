(function () {
    'use strict';

    var mongoose = require('mongoose');

    // create mongodb schema for our news
    var domainSchema = new mongoose.Schema({
        month: String,
        pfsEnabled: Number,
        pfsDisabled: Number,
        total: Number
    }, {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    });

    module.exports = mongoose.model('pfsOverview', domainSchema);
}());
