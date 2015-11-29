(function () {
    'use strict';

    var mongoose = require('mongoose');

    // create mongodb schema for our news
    var domainSchema = new mongoose.Schema({
        month: String,
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

    module.exports = mongoose.model('cipherSummary', domainSchema);
}());
