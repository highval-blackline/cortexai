const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;
const { getDB } = require('../config/db');

// Gemini Yapılandırması
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const analyzeProduct = async (req, res) => {
    try {
        const { description, price, model } = req.body;
        const db = getDB().db;

        // 1. Resim Yükleme (Cloudinary)
        let imageUrl = "";
        if (req.file) {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: "piyasa_ai" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });
            imageUrl = result.secure_url;
        }

        // 2. Gemini AI Analizi
        const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Sen bir ikinci el uzmanısın. Ürün: ${model}, Fiyat: ${price} TL, Açıklama: ${description}. 
        Bu ilanın dolandırıcılık riskini %0-100 arası puanla ve kısa bir neden yaz. 
        Yanıtı sadece şu formatta ver: {"score": 45, "reason": "Fiyat şüpheli"}`;

        const aiResult = await aiModel.generateContent(prompt);
        const responseText = aiResult.response.text();
        const cleanJson = responseText.replace(/```json|```/g, "").trim();
        const analysis = JSON.parse(cleanJson);

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

        // İstatistikleri Güncelle (Risk %80 üzeriyse dolandırıcı sayısını artır)
        if (analysis.score >= 80) {
            await statsCollection.updateOne(
                { id: 'global' },
                { $inc: { globalFrauds: 1 } },
                { upsert: true }
            );
        }

        res.json({
            success: true,
            analysis,
            imageUrl,
            id: insertResult.insertedId
        });

    } catch (error) {
        console.error("Analiz hatası:", error);
        res.status(500).json({ success: false, error: "AI Analizi yapılamadı." });
    }
};

const getAnalysisById = async (req, res) => {
    const db = getDB().db;
    try {
        const { ObjectId } = require('mongodb');
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