(function () {
    'use strict';

    var mongoose = require('mongoose');

    // create mongodb schema for our news
    var schema = new mongoose.Schema({
        domain: String,
        sources: [String],
        lastScanDate: Date,
        inserted: Date,
        wip: Boolean,
        scanCounter: Number
    }, {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    });

    module.exports = mongoose.model('Domain', schema);
}());
