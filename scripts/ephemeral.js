// Iterates through all Cipher Suites and adds ephemeral field
// Usage: 'mongo < ephermeral.js'
// This is a mongo shell script, not nodejs.

use tls;
db.scans.find({}).forEach(function(scan) {
    scan.ciphers.forEach(function(cipher) {
        var cipherName = cipher.cipher;
        var exploded = cipherName.split("-");

        if (exploded[0] === "ECDHE" || exploded[0] === "DHE") {
            cipher.ephemeral = true;
        } else {
            cipher.ephemeral = false;
        }
    });

    db.scans.update({_id: scan._id},
    {
        "$set": { "ciphers": scan.ciphers }
    });
});