(function () {
    'use strict';

    var fs = require('fs');
    var https = require('https');
    var async = require('async');
    var morgan = require('morgan');
    var express = require('express');
    var mongoose = require('mongoose');
    var schedule = require('node-schedule');
    var spawn = require('child_process').spawn;

    // api version & url
    var apiVersion = 0;
    var apiBaseUrl = '/api/v' + apiVersion;

    // ssl
    var use_ssl;
    var https_options;
    try {
        use_ssl = true;
        var key = fs.readFileSync('./ssl.key');
        var cert = fs.readFileSync('./ssl.crt');
        // load passphrase from file
        //var pass = require('./ssl-pass');
        https_options = {
            key: key,
            cert: cert
            //passphrase: pass.passphrase
        };
    } catch(err) {
        if (err) { use_ssl = false; }
    }

    // mongodb
    var mongohost = 'localhost:27017';
    var mongodb = process.env.TLSDB || 'tls';
    var mongoConnection = 'mongodb://' + mongohost + '/' + mongodb;

    // connect
    if (mongoose.connection.readyState === 0) { mongoose.connect(mongoConnection); }

    // create model
    var TLSModel = require('./tlsSchema');

    // create the express app, router & configure port
    var app = express();
    var router = express.Router();
    var apiPort = process.env.TLSPORT || 1337;

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
    router.use('/scans', require('./routes/scans'));
    router.use('/ciphers', require('./routes/ciphers'));
    router.use('/pfs', require('./routes/pfs'));
    router.use('/exp', require('./routes/exp'));
    router.use('/mac', require('./routes/mac'));
    router.use('/keysize', require('./routes/keysize'));
    router.use('/hostcount', require('./routes/hostcount'));
    router.use('/auth', require('./routes/auth'));
    router.use('/enc', require('./routes/enc'));
    router.use('/kx', require('./routes/kx'));

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

    // setup cron jobs for the aggregators
    schedule.scheduleJob('5 3 * * *', function(){
        spawn('node', ['./queries/pfsOverview.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('15 3 * * *', function(){
        spawn('node', ['./queries/cipherSummaryGlobal.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('25 3 * * *', function(){
        spawn('node', ['./queries/cipherSummaryPerTld.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('35 3 * * *', function(){
        spawn('node', ['./queries/pfsDistributionGlobal.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('40 3 * * *', function(){
        spawn('node', ['./queries/pfsDistributionPerTld.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('45 3 * * *', function(){
        spawn('node', ['./queries/expOverviewGlobal.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('45 3 * * *', function(){
        spawn('node', ['./queries/expOverviewPerTld.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('50 3 * * *', function(){
        spawn('node', ['./queries/macDistributionGlobal.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('55 3 * * *', function(){
        spawn('node', ['./queries/macDistributionPerTld.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('0 4 * * *', function(){
        spawn('node', ['./queries/hostCount.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('5 4 * * *', function(){
        spawn('node', ['./queries/authOverviewGlobal.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('10 4 * * *', function(){
        spawn('node', ['./queries/authOverviewPerTld.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('15 4 * * *', function(){
        spawn('node', ['./queries/encOverviewGlobal.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('20 4 * * *', function(){
        spawn('node', ['./queries/encOverviewPerTld.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('25 4 * * *', function(){
        spawn('node', ['./queries/kxOverviewGlobal.js'], { stdio: 'inherit' });
    });

    schedule.scheduleJob('30 4 * * *', function(){
        spawn('node', ['./queries/kxOverviewPerTld.js'], { stdio: 'inherit' });
    });

    // start the server
    console.log('\n* starting the tls api\n');
    console.log('  mongodb:  ' + mongoConnection);
    console.log('  ssl:      ' + use_ssl);
    var server;
    if (use_ssl) {
        server = https.createServer(https_options, app).listen(apiPort);
        console.log('  url:      https://localhost:' + apiPort + apiBaseUrl);
    } else {
        server = app.listen(apiPort);
        console.log('  url:      http://localhost:' + apiPort + apiBaseUrl);
    }

    // starter & stopper functions for testing
    var startApi = function() {
        if (!server) { server = app.listen(apiPort); }
    };

    var stopApi = function() {
        server.close();
    };

    // export functions
    module.exports = { startApi: startApi, stopApi: stopApi };
}());
