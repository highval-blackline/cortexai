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
        // UI Çıktısı: "Analiz:" veya "Taraması" eklerini siliyoruz
        let model = req.body.title || req.body.model || "Bilinmeyen Cihaz";
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
        const prompt = `Sen bir veri işlemci (data processor) modundasın. 
        Bugün 28 Nisan 2026. İlan tarihlerini analiz dışı bırak ve görmezden gel.
        iPhone 17 ve sağlanan listedeki tüm cihazlar mevcuttur.
        
        REFERANS FİYAT LİSTESİ (JSON):
        ${JSON.stringify(piyasaVeritabani)}

        PROTOKOL:
        1. Başlık Temizliği: Cihazı SADECE yukarıdaki listedeki anahtar isimle eşleştir (Örn: "iPhone 17 Pro Max"). "Analiz:", "Taraması:" gibi ifadeleri asla kullanma. Eşleşme yoksa "Bilinmeyen Cihaz" kullan.
        2. Fiyat Ayıklama: İlan fiyatını (P) görselden veya metinden rakamsal olarak ayıkla (Örn: "115.000 TL").
        3. Matematiksel Risk Algoritması: 
           - Vmin = Database Alt Limit (İkinci El veya Sıfır farketmez, en düşük olanı baz al).
           - P < (Vmin * 0.80) ise score: 95, status: "Dolandırıcı Riski!".
           - P >= (Vmin * 0.94) ise score: 10, status: "Güvenli / Uygun".
           - Aradaki değerler için score: 60, status: "Şüpheli İlan".
        4. Piyasa Değeri (Market Value): SADECE listedeki fiyat aralığını yaz (Örn: "105.000 TL - 115.000 TL"). Cümle kurma, yorum yapma.
        
        Yanıtı SADECE şu JSON formatında ver, başka hiçbir şey yazma: 
        {
          "score": 95, 
          "status": "Dolandırıcı Riski!",
          "reason": "Fiyat piyasanın %20'den fazla altında", 
          "detected_model": "iPhone 17 Pro Max", 
          "extracted_price": "85.000 TL", 
          "market_value": "105.000 TL - 115.000 TL"
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
        
        const newEntry = {
            model: analysis.detected_model || model,
            price: analysis.extracted_price || price,
            marketValue: analysis.market_value || "Veri Yok",
            riskScore: analysis.score,
            status: analysis.status || (analysis.score >= 90 ? "Dolandırıcı Riski!" : (analysis.score >= 40 ? "Şüpheli İlan" : "Güvenli / Uygun")),
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