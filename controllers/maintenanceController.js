const { getDB } = require('../config/db');

/**
 * Sistemi temiz bir başlangıç moduna alır.
 * Eski analizleri temizler ve istatistik sayaçlarını sıfırlar.
 */
const freshStart = async (req, res) => {
    const dbInstance = getDB();
    const db = dbInstance.db;

    if (!db) {
        return res.status(500).json({ success: false, error: 'Veritabanı bağlantısı kurulamadı.' });
    }

    try {
        // 1. Tüm eski analizleri temizle
        const deleteResult = await db.collection('feed').deleteMany({});
        
        // 2. İstatistik sayaçlarını sıfırla
        await db.collection('stats').updateOne(
            { id: 'global' },
            { $set: { globalAnalyses: 0, globalFrauds: 0 } },
            { upsert: true }
        );

        console.log(`Fresh Start Uygulandı: ${deleteResult.deletedCount} kayıt silindi.`);
        
        res.json({ 
            success: true, 
            message: 'Sistem temiz bir başlangıç moduna alındı.',
            deletedCount: deleteResult.deletedCount
        });
    } catch (err) {
        console.error("Fresh Start Hatası:", err);
        res.status(500).json({ success: false, error: 'Sistem temizlenirken hata oluştu.' });
    }
};

module.exports = { freshStart };
