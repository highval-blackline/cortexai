const { MongoClient } = require('mongodb');

let client;
let dbInstance = { db: null };

async function connectDB() {
    if (dbInstance.db) return dbInstance;
    try {
        const uri = (process.env.MONGO_URI || "").trim();
        if (!uri) throw new Error("MONGO_URI tanimlanmamis.");

        // db.js
client = new MongoClient(uri, {
    connectTimeoutMS: 10000, // 10 saniyeye düşürdük
    socketTimeoutMS: 10000,  // 10 saniyeye düşürdük
    family: 4
});
        await client.connect();
        const db = client.db('CortexAI');
        dbInstance.db = db;
        dbInstance.statsCollection = db.collection('stats');
        dbInstance.feedCollection = db.collection('feed');
        console.log('MongoDB baglantisi basarili.');
        return dbInstance;
    } catch (err) {
        console.error('MongoDB baglanti hatasi:', err);
        throw err;
    }
}

const getDB = () => dbInstance;

module.exports = { connectDB, getDB };