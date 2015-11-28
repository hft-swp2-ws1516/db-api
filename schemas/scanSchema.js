(function () {
    'use strict';

    var mongoose = require('mongoose');

    // create mongodb schema for our news
    var scanSchema = new mongoose.Schema({
        sources: [String],
        scanDate: {type: Date, required: true},
        domain: {type: String, required: true},
        scanError: {type: Boolean, required: true},
        scanErrorMessage: String,
        tld: String,
        certificate: {
            expired: Boolean,
            issuer: String,
            selfSigned: Boolean,
            notValidAfter: Date,
            notValidBefore: Date,
            signatureAlgorithm: String,
            publicKeyAlgorithm: String,
            publicKeyLength: Number,
            subject: String
        },
        ciphers: [{
            status: String,
            cipher: String,
            curve: String,
            bits: Number,
            protocol: String,
            kx: String,
            kxStrenght: Number,
            au: String,
            enc: String,
            mac: String,
            export: Boolean
        }]
    }, {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    });

    module.exports = mongoose.model('Scan', scanSchema);
}());
