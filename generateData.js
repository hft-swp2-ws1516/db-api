'use strict';

// npm
var async = require('async');
var mongoose = require('mongoose');
var tldjs = require('tldjs');

// how many entries do you want?
var howMany = 100000;

var domains = ['google.com', 'facebook.com', 'youtube.com', 'baidu.com', 'yahoo.com', 'amazon.com', 'wikipedia.org', 'qq.com', 'twitter.com', 'google.co.in', 'taobao.com', 'live.com', 'sina.com.cn', 'linkedin.com', 'yahoo.co.jp', 'weibo.com', 'ebay.com', 'google.co.jp', 'yandex.ru', 'hao123.com', 'vk.com', 'bing.com', 'google.de', 't.co', 'instagram.com', 'msn.com', 'amazon.co.jp', 'google.co.uk', 'aliexpress.com', 'apple.com', 'pinterest.com', 'ask.com', 'blogspot.com', 'tmall.com', 'wordpress.com', 'reddit.com', 'google.fr', 'google.com.br', 'onclickads.net', 'paypal.com', 'mail.ru', 'tumblr.com', 'sohu.com', 'microsoft.com', 'imgur.com', 'google.ru', 'xvideos.com', 'imdb.com', 'google.it', 'google.es', 'gmw.cn', 'netflix.com', 'fc2.com', 'amazon.de', '360.cn', 'googleadservices.com', 'alibaba.com', 'go.com', 'stackoverflow.com', 'google.com.mx', 'google.ca', 'ok.ru', 'google.com.hk', 'craigslist.org', 'tianya.cn', 'amazon.co.uk', 'pornhub.com', 'rakuten.co.jp', 'blogger.com', 'naver.com', 'google.com.tr', 'espn.go.com', 'xhamster.com', 'soso.com', 'outbrain.com', 'cnn.com', 'nicovideo.jp', 'kat.cr', 'google.co.id', 'bbc.co.uk', 'diply.com', 'dropbox.com', 'github.com', 'flipkart.com', 'adcash.com', 'amazon.in', 'googleusercontent.com', 'google.com.au', 'xinhuanet.com', 'ebay.de', 'google.pl', 'popads.net', 'google.co.kr', 'dailymotion.com', 'pixnet.net', 'ebay.co.uk', 'nytimes.com', 'sogou.com', 'bbc.com', 'jd.com'];
var ciphers = ['ECDHE-ECDSA-AES256-GCM-SHA384', 'ECDHE-ECDSA-AES128-GCM-SHA256', 'ECDHE-RSA-AES256-GCM-SHA384', 'ECDHE-RSA-AES128-GCM-SHA256', 'DHE-RSA-AES256-GCM-SHA384', 'DHE-RSA-AES128-GCM-SHA256', 'ECDHE_ECDSA_WITH_AES_128_CBC_SHA256', 'ECDHE_ECDSA_WITH_AES_128_CBC_SHA', 'ECDHE_ECDSA_WITH_3DES_EDE_CBC_SHA', 'ECDH_RSA_WITH_RC4_128_SHA', 'ECDH_RSA_WITH_NULL_SHA', 'ECDH_RSA_WITH_CAMELLIA_256_GCM_SHA384', 'ECDH_RSA_WITH_CAMELLIA_256_CBC_SHA384', 'ECDH_RSA_WITH_CAMELLIA_128_GCM_SHA256', 'ECDH_RSA_WITH_CAMELLIA_128_CBC_SHA256', 'ECDH_RSA_WITH_ARIA_256_GCM_SHA384', 'ECDH_RSA_WITH_ARIA_256_CBC_SHA384', 'PSK_WITH_AES_128_CBC_SHA256', 'PSK_WITH_AES_128_CBC_SHA', 'PSK_DHE_WITH_AES_256_CCM_8', 'PSK_DHE_WITH_AES_128_CCM_8'];

// mongodb
var mongohost='localhost:27017';
var mongodb=process.env.TLSDB || 'tls';
var mongoConnection='mongodb://' + mongohost + '/' + mongodb;
mongoose.connect(mongoConnection);

// mongodb schema
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
var TLSModel = mongoose.model('tls', TLSSchema);


function genEntry(callback) {
    // generate entry
    var entry = new TLSModel();
    // generate date
    entry.date = new Date();
    // random domain from array
    entry.domain = domains[Math.floor(Math.random()*domains.length)];
    // domain tld
    entry.tld = tldjs.getPublicSuffix(entry.domain);
    // random pref_cs
    entry.pref_cs = ciphers[Math.floor(Math.random()*ciphers.length)];
    // generate random ciphersuite list
    async.each(ciphers.slice(1, Math.floor(Math.random()*ciphers.length)), function(cipher) {
        entry.avail_cs.push(cipher);
    });

    // save to database
    entry.save(function (err) {
        if (err) { console.log(err); }
        callback();
    });
}

async.times(howMany, function(n, next) {
    genEntry(next);
}, function() {
    console.log('all done');
    mongoose.disconnect();
});
