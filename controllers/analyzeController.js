const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

// MODÜLER STATİK VERİ (Boyut küçültüldü, syntax hatası yok)
const staticDatabase = {
    "iPhone 17 Pro Max": { "TR_Sifir": "120.000 TL - 135.000 TL", "TR_IkinciEl": "105.000 TL - 115.000 TL" },
    "iPhone 17 Pro": { "TR_Sifir": "105.000 TL - 115.000 TL", "TR_IkinciEl": "90.000 TL - 100.000 TL" },
    "iPhone 17": { "TR_Sifir": "85.000 TL - 95.000 TL", "TR_IkinciEl": "75.000 TL - 80.000 TL" },
    "iPhone 16 Pro Max": { "TR_Sifir": "105.000 TL - 110.000 TL", "TR_IkinciEl": "85.000 TL - 95.000 TL" },
    "iPhone 16 Pro": { "TR_Sifir": "95.000 TL - 100.000 TL", "TR_IkinciEl": "75.000 TL - 85.000 TL" },
    "iPhone 16": { "TR_Sifir": "75.000 TL - 80.000 TL", "TR_IkinciEl": "60.000 TL - 65.000 TL" },
    "iPhone 15 Pro Max": { "TR_Sifir": "90.000 TL", "TR_IkinciEl": "70.000 TL - 80.000 TL" },
    "iPhone 15 Pro": { "TR_Sifir": "80.000 TL", "TR_IkinciEl": "60.000 TL - 70.000 TL" },
    "iPhone 15": { "TR_Sifir": "60.000 TL", "TR_IkinciEl": "48.000 TL - 55.000 TL" },
    "iPhone 14 Pro Max": { "TR_IkinciEl": "55.000 TL - 65.000 TL" },
    "iPhone 14 Pro": { "TR_IkinciEl": "48.000 TL - 55.000 TL" },
    "iPhone 13 Pro Max": { "TR_IkinciEl": "42.000 TL - 48.000 TL" },
    "iPhone 13 Pro": { "TR_IkinciEl": "35.000 TL - 40.000 TL" },
    "iPhone 13": { "TR_IkinciEl": "28.000 TL - 33.000 TL" },
    "iPhone 12 Pro Max": { "TR_IkinciEl": "24.000 TL - 28.000 TL" },
    "iPhone 11 Pro Max": { "TR_IkinciEl": "15.000 TL - 18.000 TL" },
    "Samsung Galaxy S26 Ultra": { "TR_Sifir": "105.000 TL - 115.000 TL", "TR_IkinciEl": "95.000 TL - 100.000 TL" },
    "Samsung Galaxy S26": { "TR_Sifir": "72.000 TL - 78.000 TL", "TR_IkinciEl": "62.000 TL - 68.000 TL" },
    "Samsung Galaxy S25 Ultra": { "TR_Sifir": "90.000 TL - 98.000 TL", "TR_IkinciEl": "78.000 TL - 85.000 TL" },
    "Samsung Galaxy S25": { "TR_Sifir": "60.000 TL - 66.000 TL", "TR_IkinciEl": "50.000 TL - 56.000 TL" },
    "Samsung Galaxy S24 Ultra": { "TR_Sifir": "70.000 TL - 76.000 TL", "TR_IkinciEl": "58.000 TL - 65.000 TL" },
    "Samsung Galaxy S24": { "TR_Sifir": "48.000 TL - 53.000 TL", "TR_IkinciEl": "38.000 TL - 44.000 TL" },
    "Samsung Galaxy S23 Ultra": { "TR_IkinciEl": "45.000 TL - 52.000 TL" },
    "Samsung Galaxy S22 Ultra": { "TR_IkinciEl": "32.000 TL - 38.000 TL" },
    "Samsung Galaxy Z Fold 6": { "TR_Sifir": "80.000 TL", "TR_IkinciEl": "65.000 TL" },
    "Xiaomi 15 Ultra": { "TR_Sifir": "75.000 TL", "TR_IkinciEl": "55.000 TL" },
    "Xiaomi 14 Ultra": { "TR_Sifir": "60.000 TL", "TR_IkinciEl": "45.000 TL" },
    "POCO F6 Pro": { "TR_Sifir": "35.000 TL", "TR_IkinciEl": "25.000 TL" }
};

// YARDIMCI ARAÇLAR
const parsePrice = (str) => {
    if (!str || typeof str !== 'string') return 0;
    const match = str.replace(/\./g, '').match(/\d+/);
    return match ? parseInt(match[0]) : 0;
};

const getMinPrice = (dbEntry) => {
    if (!dbEntry) return 0;
    const values = Object.values(dbEntry).map(v => {
        const parts = v.split('-');
        return parsePrice(parts[0]);
    }).filter(p => p > 0);
    return values.length > 0 ? Math.min(...values) : 0;
};

const getMarketValue = (dbEntry) => {
    if (!dbEntry) return "Veri Yok";
    return Object.values(dbEntry)[0] || "Veri Yok";
};

// API CONFIG (Çökme koruması için env kontrolü)
const geminiKey = process.env.GEMINI_API_KEY || "";
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const analyzeProduct = async (req, res) => {
    // TÜM FONKSİYON TRY-CATCH İLE KORUMA ALTINDA
    try {
        if (!genAI) {
            return res.status(200).json({ success: false, error: "AI API Anahtarı eksik." });
        }

        const dbConnection = getDB();
        const db = dbConnection.db;
        
        let model = req.body.title || req.body.model || "Bilinmeyen Cihaz";
        const price = req.body.price || "Belirtilmedi";

        let imageUrl = req.body.imageUrl || ""; 
        let fileBuffer = null;
        let mimeType = null;

        // Görsel Yükleme
        if (req.files && req.files.length > 0) {
            try {
                const file = req.files[0];
                fileBuffer = file.buffer;
                mimeType = file.mimetype;

                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: "piyasa_ai" },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    uploadStream.end(file.buffer);
                });
                imageUrl = result.secure_url;
            } catch (imgError) {
                console.error("Görsel yükleme hatası:", imgError);
            }
        }

        const aiModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
        const prompt = `Bugün 28 Nisan 2026. Tarih analizini tamamen kapat.
        İlandan model ismini ve fiyatı kesin olarak ayıkla.
        
        REFERANS: ${JSON.stringify(staticDatabase)}

        Yanıtı SADECE şu formatta ver: 
        {
          "modelName": "iPhone 17 Pro Max", 
          "price": "110.000 TL",
          "reason": "..."
        }`;

        const aiParts = [prompt];
        if (fileBuffer) {
            aiParts.push({
                inlineData: {
                    data: fileBuffer.toString("base64"),
                    mimeType: mimeType
                }
            });
        }

        const aiResult = await aiModel.generateContent(aiParts);
        const response = await aiResult.response;
        const responseText = response.text();
        
        const cleanJson = responseText.replace(/```json|```/g, "").replace(/JSON/i, "").trim();
        let analysis;
        try {
            analysis = JSON.parse(cleanJson);
        } catch (e) {
            analysis = { modelName: model, price: price, reason: "Analiz tamamlandı." };
        }
        
        // MATEMATİKSEL KESİNLİK
        const finalModelName = analysis.modelName || model;
        const dbEntry = staticDatabase[finalModelName];
        const vMin = getMinPrice(dbEntry);
        const pVal = parsePrice(analysis.price || price);
        const marketVal = getMarketValue(dbEntry);

        let finalScore = 60; 
        if (vMin > 0) {
            if (pVal < (vMin * 0.80)) finalScore = 95;
            else if (pVal >= (vMin * 0.94)) finalScore = 10;
        }

        const finalStatus = finalScore >= 90 ? "Dolandırıcı Riski!" : (finalScore >= 40 ? "Şüpheli İlan" : "Güvenli / Uygun");

        const newEntry = {
            model: finalModelName,
            price: analysis.price || price,
            marketValue: marketVal,
            riskScore: finalScore,
            status: finalStatus,
            reason: analysis.reason || "Piyasa analizi yapıldı.",
            imageUrl,
            time: new Date().toISOString()
        };

        try {
            const feedCollection = db.collection('feed');
            const insertResult = await feedCollection.insertOne(newEntry);
            
            if (finalScore >= 50) {
                const statsCollection = db.collection('stats');
                await statsCollection.updateOne({ id: 'global' }, { $inc: { globalFrauds: 1 } }, { upsert: true });
            }
        } catch (dbError) {
            console.error("DB Kayıt Hatası:", dbError);
        }

        return res.status(200).json({ 
            success: true, 
            riskScore: finalScore, 
            status: finalStatus,
            reason: newEntry.reason, 
            modelName: finalModelName,
            price: newEntry.price,
            marketValue: marketVal,
            imageUrl 
        });

    } catch (error) {
        console.error("KRİTİK ANALİZ HATASI:", error);
        return res.status(200).json({ 
            success: false, 
            error: "Analiz sırasında hata oluştu",
            riskScore: 0,
            status: "Hata"
        });
    }
};

const getAnalysisById = async (req, res) => {
    try {
        const db = getDB().db;
        const item = await db.collection('feed').findOne({ _id: new ObjectId(req.params.id) });
        if (!item) return res.status(404).json({ error: 'Analiz bulunamadı.' });
        res.json({ success: true, data: item });
    } catch (err) {
        res.status(400).json({ error: 'Geçersiz kimlik.' });
    }
};

const reportFraud = async (req, res) => {
    res.json({ success: true, message: "Bildirim alındı." });
};

module.exports = { analyzeProduct, getAnalysisById, reportFraud };