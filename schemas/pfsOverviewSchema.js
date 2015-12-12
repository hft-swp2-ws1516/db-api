(function () {
    'use strict';

    var mongoose = require('mongoose');

    // create mongodb schema for our news
    var schema = new mongoose.Schema({
        month: String,
        tld: String,
        pfsEnabled: Number,
        pfsDisabled: Number,
        totalHosts: Number
    }, {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    });

    schema.options.toJSON.transform = function (doc, ret, options) {
        // remove the _id of every document before returning the result
        delete ret._id;
        delete ret.id;
    };

    module.exports = mongoose.model('PfsOverview', schema);
}());
