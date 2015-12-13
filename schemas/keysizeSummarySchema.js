(function () {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    
    // keysizeOverview Schema
    var keysizeSchema = new Schema({
        publicKeyLength: Number,
        totalAmount: Number
    }, {
        toObject: { virtuals: true },
        toJSON: { virtuals: true }
    });
    
    // Create Model using the keysizeSchema
    var KeysizeSummary = mongoose.model('KeysizeOverview', keysizeSchema);
    module.exports = KeysizeSummary;
}());