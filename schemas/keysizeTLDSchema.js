(function() {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    // keysizeOverview Schema
    var keysizeTLDSchema = new Schema({
	month : String,
	tld : String,
	sumTLD: [{
	    publicKeyLength : Number,
	    totalAmount : Number
	}]
    }, {
	toObject : {
	    virtuals : true
	},
	toJSON : {
	    virtuals : true
	}
    });

    // Create Model using the keysizeSchema
    var KeysizeTLD = mongoose.model('KeysizeTLD', keysizeTLDSchema);
    module.exports = KeysizeTLD;
}());