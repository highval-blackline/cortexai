const { MongoClient } = require('mongodb');

let dbInstance = {};

async function connectDB() {
    try {
        const client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        const db = client.db('PiyasaAI');
        
        dbInstance.db = db;
        dbInstance.statsCollection = db.collection('stats');
        dbInstance.feedCollection = db.collection('feed');
        
        console.log('MongoDB baglantisi basarili.');
        return dbInstance;
    } catch (err) {
    console.error('MongoDB baglanti hatasi:', err);
    process.exit(1);
}
}

const getDB = () => dbInstance;

module.exports = { connectDB, getDB };