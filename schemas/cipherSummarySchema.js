(function () {
    'use strict';

    var mongoose = require('mongoose');

    // create mongodb schema for our news
    var schema = new mongoose.Schema({
        month: String,
        tld: String,
        summary: [{
            count: Number,
            cipher: String,
            protocol: String,
            status: String
        }]
    }, {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    });

    module.exports = mongoose.model('CipherSummary', schema);
}());
