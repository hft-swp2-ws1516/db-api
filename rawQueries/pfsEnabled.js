// jshint ignore: start
use tls;
db.scans.aggregate([
    { $sort: {scanDate: -1} },
    { $group: {
        _id: "$domain",
        ciphers: {$first: "$ciphers" }
    }},
    { $unwind : "$ciphers" },
    { $project: {
        _id: 0,
        domain: "$_id",
        cipher: "$ciphers"
    }},
    { $match: {
        $or: [{"cipher.kx": "ECDH"}, {"cipher.kx": "DH"}]
    }},
    { $group: {
        _id: "$domain",
    }},
    { $group: {
        _id: null,
        count: {$sum: 1}
    }}
], {allowDiskUse: true}).pretty();
