// jshint ignore: start
// slower then aggregate :-(
use tls;
var mapFunction = function() {
    for (var i = 0;  i < this.ciphers.length; i++) {
        if (!this.scanError) {
            var key = {};
            key.cipher = this.ciphers[i].cipher;
            key.protocol = this.ciphers[i].protocol;
            key.status = this.ciphers[i].status;
            value = 1;
            emit(key, 1);
        }
    }
};

var reduceFunction = function(key, value) {
    return Array.sum(value);
};

db.scans.mapReduce(
    mapFunction,
    reduceFunction,
    { out: {inline: 1} }
)
