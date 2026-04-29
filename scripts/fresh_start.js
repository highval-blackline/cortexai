const { connectDB } = require('../config/db');

async function run() {
    try {
        console.log("Bağlanılıyor...");
        const dbInstance = await connectDB();
        const db = dbInstance.db;
        
        console.log("Fresh Start başlatılıyor...");

        // 1. Eski analizleri temizle
        const feedResult = await db.collection('feed').deleteMany({});
        console.log(`${feedResult.deletedCount} adet eski analiz temizlendi.`);

        // 2. İstatistikleri sıfırla
        await db.collection('stats').updateOne(
            { id: 'global' },
            { $set: { globalAnalyses: 0, globalFrauds: 0 } },
            { upsert: true }
        );
        console.log("İstatistik sayaçları sıfırlandı.");

        console.log("Sistem temiz bir başlangıç moduna alındı. ✅");
    } catch (err) {
        console.error("Hata oluştu:", err);
    } finally {
        process.exit(0);
    }
}

run();
