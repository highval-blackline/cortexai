const { getDB } = require('../config/db');

const getRecentFeed = async (req, res) => {
    const db = getDB().db;
    if (!db) return res.status(500).json({ error: 'DB baglantisi yok.' });

    try {
        const feedCollection = db.collection('feed');
        // Son 10 analizi getir
        const recentFeed = await feedCollection.find().sort({ time: -1 }).limit(10).toArray();
        res.json(recentFeed);
    } catch (error) {
        res.status(500).json({ error: 'Veriler cekilemedi.' });
    }
};

const getGlobalStats = async (req, res) => {
    const db = getDB().db;
    if (!db) return res.status(500).json({ error: 'DB baglantisi yok.' });

    try {
        const statsCollection = db.collection('stats');
        const stats = await statsCollection.findOne({ id: 'global' });
        res.json(stats || { globalFrauds: 0, globalAnalyses: 0 });
    } catch (error) {
        res.status(500).json({ error: 'İstatistikler cekilemedi.' });
    }
};

module.exports = { getRecentFeed, getGlobalStats };