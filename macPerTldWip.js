use tls;
db.scans.aggregate([
    // match all documents in the current month
    // { $match: {
    //     scanDate: {$gte: monthStart.toDate(), $lte: monthEnd.toDate()}
    // }},
    // get the distinct, newest scan of every domain
    { $sort: {scanDate: -1} },
    { $group: {
        _id: "$domain",
        tld: {$first: "$tld" },
        ciphers: {$first: "$ciphers" }
    }},
    // undwind every cipher
    { $unwind : "$ciphers" },
    // cosmetics
    { $project: {
        _id: 0,
        domain: "$_id",
        tld: 1,
        cipher: "$ciphers"
    }},
    // group by domain and mac
    { $group: {
        _id: {
            domain: "$domain",
            mac: "$cipher.mac",
        },
        tld: {$first: "$tld" },
        count: {$sum: 1},
    }},
    // count the macs per tld
    { $group: {
        _id: {
            mac: "$_id.mac",
            tld: "$tld"
        },
        count: {$sum: "$count"}
    }},
    { $project: {
        _id: 0,
        mac: "$_id.mac",
        tld: "$_id.tld",
        count: 1,
    }},
    { $group: {
        _id: "$tld",
        distribution: {$push: "$$ROOT"}
    }},
    { $project: {
        tld: "$_id",
        _id: 0,
        distribution: 1
    }}
]).pretty();
