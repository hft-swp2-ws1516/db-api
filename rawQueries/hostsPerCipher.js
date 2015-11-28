// jshint ignore: start

use tls;
db.scans.aggregate([
    { $sort: {scanDate: -1} },
    { $group: {
        _id: "$domain",
        ciphers: {$first: "$ciphers" }
    }},
    { $unwind : "$ciphers" },
    { $group: {
        _id: {
            cipher: "$ciphers.cipher",
            protocol: "$ciphers.protocol",
            status: "$ciphers.status"
        },
        count: {$sum: 1}
    }},
    {
        $project: {
            _id: 0,
            cipher: "$_id.cipher",
            protocol: "$_id.protocol",
            status: "$_id.status",
            count: 1
        }
    },
    {
        $sort: {count: -1}
    }
], {allowDiskUse: true}).pretty();
