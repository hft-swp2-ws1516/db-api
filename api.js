// db-api server
'use strict';

// core
var fs = require('fs');
var https = require('https');
// npm
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');
var morgan = require('morgan');


// api version & url
var apiVersion = 0;
var apiBaseUrl = '/api/v' + apiVersion;


// ssl
try {
    var use_ssl = true;
    var key = fs.readFileSync('./ssl.key');
    var cert = fs.readFileSync('./ssl.crt');
    // load passphrase from file
    var pass = require('./ssl-pass');
    var https_options = {
        key: key,
        cert: cert,
        passphrase: pass.passphrase
    };
} catch(err) {
    if (err) { use_ssl = false; }
}


// mongodb
var mongohost='localhost:27017';
var mongodb=process.env.TLSDB || 'tls';
var mongoConnection='mongodb://' + mongohost + '/' + mongodb;
// connect
if(mongoose.connection.readyState === 0) { mongoose.connect(mongoConnection); }

// create model
var TLSModel = require('./tlsSchema');


// create the express app, router & configure port
var app = express();
var router = express.Router();
var apiPort = process.env.TLSORT || 1337;

// use morgan to log
app.use(morgan('dev'));

// allow cross origin resource sharing
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// api home route (GET /$apiBaseUrl)
router.get('/', function(req, res) {
    res.status(200).json({ message: 'welcome to the tls api v' + apiVersion });
    res.end();
});

// register our routes & routers
router.use('/demo', require('./routes/demo'));

// register base & default router
app.use(apiBaseUrl, router);

// catch-all route to handle 404 errors
app.get('*', function(req, res, next) {
    var err = new Error();
    err.status = 404;
    next(err);
});

// handle error
app.use(function(err, req, res, next) {
    if(err.status === 404) {
        // send 404
        res.status(404).send({ msg: 'whoopsie!' });
    } else {
        // log error
        console.error(err);
        res.status(500).send({ msg: 'big whoopsie!' });
    }
});


// start the server
console.log('\n* starting the tls api\n');
console.log('  mongodb:  ' + mongoConnection);
console.log('  ssl:      ' + use_ssl);
if (use_ssl) {
    var server = https.createServer(https_options, app).listen(apiPort);
    console.log('  url:      https://localhost:' + apiPort + apiBaseUrl);
} else {
    var server = app.listen(apiPort);
    console.log('  url:      http://localhost:' + apiPort + apiBaseUrl);
}
console.log();


// starter & stopper functions for testing
var startApi = function() {
    if (!server) { server = app.listen(apiPort); }
};
var stopApi = function() {
    server.close();
};


// export functions
module.exports = { startApi: startApi, stopApi: stopApi };
