(function () {
    'use strict';

    var mongoose = require('mongoose');

    // create mongodb schema for our news
    var TLSSchema = new mongoose.Schema({
        domain: String,
        tld: String,
        certificate: {
            expired: Boolean,
            issuer: String,
            notValidAfeter: Date,
            notValidBefore: Date,
            signatureAlgorithm: String,
            publicKeyAlgorithm: String,
            publicKeyLength: Number,
            subject: String
        },
        ciphers: [{
            status : String,
            bits : Number,
            cipher : String,
            curve : String,
            protocol : String,
            kx : String,
            kxStrength: Number,
            au : String,
            enc : String,
            mac : String,
            export : Boolean
        }]
    }, {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    });

    // export the model
    module.exports = mongoose.model('tls', TLSSchema);
}());
