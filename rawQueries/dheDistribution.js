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
        _id: {
            domain: "$domain",
            kx: "$cipher.kx",
            kxStrenght: "$cipher.kxStrenght"
        },
        count: {$sum: 1}
    }},
    { $group: {
        _id: {
            kx: "$_id.kx",
            kxStrenght: "$_id.kxStrenght"
        },
        count: {$sum: 1}
    }},
    { $project: {
        _id: 0,
        kx: "$_id.kx",
        kxStrenght: "$_id.kxStrenght",
        count: 1
    }},
    {
        $sort: {count: -1}
    }
], {allowDiskUse: true}).pretty();
