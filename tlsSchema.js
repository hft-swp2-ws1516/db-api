'use strict';

var mongoose = require('mongoose');

// create mongodb schema for our news
var TLSSchema = new mongoose.Schema({
    domain: String,
    tld: String,
    date: Date,
    source: String,
    dh_key: Number,
    pref_cs: String,
    avail_cs: [String]
}, {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

// create model from our schema & export it
module.exports = mongoose.model('tls', TLSSchema);
