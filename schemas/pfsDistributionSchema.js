(function () {
    'use strict';

    var mongoose = require('mongoose');

    // create mongodb schema for our news
    var schema = new mongoose.Schema({
        month: String,
        tld: String,
        totalHosts: Number,
        distribution: [{
            count: Number,
            kx: String,
            kxStrength: String,
        }]
    }, {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    });

    module.exports = mongoose.model('PfsDistribution', schema);
}());
