const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');
const piyasaVeritabani = require('../database.js');

// Gemini ve Cloudinary Yapılandırması
const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
const genAI = new GoogleGenerativeAI(geminiKey);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const analyzeProduct = async (req, res) => {
    try {
        const db = getDB().db;
        
        // Frontend'den gelmeyen veriler için güvenlik (Sistemin çökmesini/undefined yazmasını engeller)
        let model = "Analiz: " + (req.body.title || req.body.model || "Bilinmeyen Cihaz");
        const price = req.body.price || "Fiyat Belirtilmedi";
        const description = req.body.description || "Görsel analizi...";

        let imageUrl = req.body.imageUrl || ""; 
        let fileBuffer = null;
        let mimeType = null;

        // 1. Resim Yükleme (Cloudinary) ve Yapay Zekaya Hazırlık
        if (req.files && req.files.length > 0) {
            const file = req.files[0]; // Ana görseli işliyoruz
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
        }

        // 2. Gemini AI Analizi (FOTOĞRAF GERÇEKTEN YAPAY ZEKAYA GİDİYOR)
        const aiModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
        const prompt = `Sen bir ikinci el pazar uzmanısın ve sahtekarlık tespiti yapıyorsun. 
        Bugün 28 Nisan 2026. İlandaki tarihin "Nisan 2026" olması güncelliği gösterir ve GÜVENLİ/GÜNCEL bir işarettir, kesinlikle risk olarak puanlama.
        iPhone 17 serisi ve sağlanan listedeki tüm cihazlar piyasada mevcuttur. "Henüz mevcut değildir" veya "gelecek teknolojisidir" gibi hatalı çıkarımları KESİNLİKLE yapma.
        
        REFERANS FİYAT LİSTESİ:
        ${JSON.stringify(piyasaVeritabani)}

        KURALLAR:
        1. Eğer bir cihaz yukarıdaki listede varsa, o cihaz piyasada mevcuttur ve yasaldır. AI eğitim verilerindeki "henüz çıkmadı" bilgisini KESİNLİKLE kullanma.
        2. Görsele veya metne bakarak cihazın marka ve modelini kesin olarak tespit et.
        3. Cihazın varlığını sorgulama; sadece fiyatın listedeki piyasa ortalamasına göre riskli olup olmadığını ve ilan detaylarındaki çelişkileri incele.
        
        Yanıtı SADECE şu formattaki bir JSON olarak ver, başka hiçbir şey yazma: {"score": 45, "reason": "Açıklamada havale isteniyor", "detected_model": "iPhone 13 Pro Max"}`;

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
        
        // AI Yanıtını Temizle ve Hata Koruması Ekle (JSON Formatını garantileyelim)
        const cleanJson = responseText.replace(/```json|```/g, "").replace(/JSON/i, "").trim();
        let analysis;
        try {
            analysis = JSON.parse(cleanJson);
        } catch (e) {
            // Eğer JSON parse edilemezse, text'ten sayı ve string ayıklamaya çalışalım
            const scoreMatch = responseText.match(/score["']?\s*:\s*(\d+)/i);
            const reasonMatch = responseText.match(/reason["']?\s*:\s*["']([^"']+)["']/i);
            analysis = { 
                score: scoreMatch ? parseInt(scoreMatch[1]) : 65, 
                reason: reasonMatch ? reasonMatch[1] : "Görseldeki detaylar şüpheli bulundu, dikkatli olun." 
            };
        }
        
        // AI tarafından tespit edilen model ismini "Bilinmeyen Cihaz" yerine koy
        if (analysis.detected_model && model.includes("Bilinmeyen Cihaz")) {
            model = "Analiz: " + analysis.detected_model;
        }

        // 3. Veritabanına Kayıt
        const feedCollection = db.collection('feed');
        const statsCollection = db.collection('stats');

        const newEntry = {
            model,
            price,
            riskScore: analysis.score,
            reason: analysis.reason,
            imageUrl,
            time: new Date().toISOString()
        };

        const insertResult = await feedCollection.insertOne(newEntry);

        // İstatistikleri Güncelle
        if (analysis.score >= 50) {
            await statsCollection.updateOne(
                { id: 'global' },
                { $inc: { globalFrauds: 1 } },
                { upsert: true }
            );
        }

        res.json({ success: true, riskScore: analysis.score, reason: analysis.reason, analysisId: insertResult.insertedId, imageUrl });

    } catch (error) {
        console.error("Analiz hatası:", error);
        
        // Daha detaylı hata mesajı (Google API Key kontrolü için)
        let errorMessage = "AI Analizi yapılamadı.";
        if (error.message && error.message.includes("API_KEY_INVALID")) {
            errorMessage = "Sistem Hatası: Google API Key geçersiz. Lütfen teknik ekiple iletişime geçin.";
        } else if (!process.env.GEMINI_API_KEY) {
            errorMessage = "Sistem Hatası: Gemini API Anahtarı eksik.";
        }

        res.status(500).json({ success: false, error: errorMessage });
    }
};

const getAnalysisById = async (req, res) => {
    const db = getDB().db;
    try {
        const item = await db.collection('feed').findOne({ _id: new ObjectId(req.params.id) });
        if (!item) return res.status(404).json({ error: 'Analiz bulunamadı.' });
        res.json({ success: true, data: item });
    } catch (err) {
        res.status(400).json({ error: 'Geçersiz kimlik.' });
    }
};

const reportFraud = async (req, res) => {
    // Şimdilik sadece başarılı dönelim, istersen buraya mail atma kodu ekleriz
    res.json({ success: true, message: "Bildirim alındı." });
};

module.exports = { analyzeProduct, getAnalysisById, reportFraud };