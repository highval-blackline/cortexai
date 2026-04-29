const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');
const phoneDB = require('../database.js');

// --- YARDIMCI FONKSİYONLAR ---
const parsePrice = (str) => {
    if (!str || typeof str !== 'string') return 0;
    const match = str.replace(/\./g, '').match(/\d+/);
    return match ? parseInt(match[0]) : 0;
};

const getMinPrice = (val) => {
    if (!val || typeof val !== 'string') return 0;
    const parts = val.split('-');
    return parsePrice(parts[0]);
};

// --- API YAPILANDIRMASI ---
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

/**
 * Ürün Analiz Motoru (Dahi Seviyesi)
 */
const analyzeProduct = async (req, res) => {
    try {
        if (!genAI) throw new Error("Yapay zeka anahtarı eksik.");

        const { db } = getDB();
        let initialModel = req.body.title || req.body.model || "Bilinmeyen Cihaz";
        let initialPrice = req.body.price || "0";
        let imageUrl = req.body.imageUrl || "";
        let fileBuffer = null;
        let mimeType = null;

        // Görsel Yükleme (Opsiyonel)
        if (req.files && req.files.length > 0) {
            const file = req.files[0];
            fileBuffer = file.buffer;
            mimeType = file.mimetype;

            try {
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream({ folder: "piyasa_ai" }, (err, res) => err ? reject(err) : resolve(res));
                    stream.end(file.buffer);
                });
                imageUrl = result.secure_url;
            } catch (err) {
                console.error("Cloudinary Hatası:", err);
            }
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Sen Piyasa.ai Analiz Motorusun. ŞU KURALLARI UYGULA:

        1. VERİ: Sadece ${JSON.stringify(phoneDB)} listesini kullan. Model yoksa isValid:false dön.
        2. AKILLI GÜVEN: Satıcı 15+ yıllık kurumsal mağaza ise bu GÜVEN verisi, Param Güvende kapalı olması veya Yurt Dışı olması gibi tüm riskleri domine eder. Risk puanını düşür.
        3. RİSK TARTI: Yurt dışı cihazlar piyasa normu ise (Xiaomi 17 vb.) risk skoru %15-25 bandında kalmalı. %50+ risk sadece bireysel satıcı veya uçurum fiyatlarda tetiklenmeli.
        4. ÜSLUP: %30 altı riskte olumlu, %70 üstü riskte "Elden Teslimat" odaklı sert ve uyarıcı bir dil kullan. Suçlayıcı (dolandırıcı vb.) terim kullanma.
        5. FORMAT: "Güvenli Alım Adımları:" başlığı ve maddeleri (1, 2, 3) yeni satırda olmalı.

        Yanıtı JSON olarak ver:
        {
          "isValid": true,
          "modelName": "...",
          "price": "...",
          "origin": "TR" | "YurtDisi",
          "isParamGuvende": true | false,
          "isCorporate": true | false,
          "yearsInSystem": 15,
          "riskScore": 15,
          "analysisNote": "..."
        }`;

        const aiParts = [prompt];
        if (fileBuffer) aiParts.push({ inlineData: { data: fileBuffer.toString("base64"), mimeType } });

        let responseText = "";
        try {
            const result = await model.generateContent(aiParts);
            responseText = (await result.response).text();
        } catch (err) {
            throw new Error("Yapay zeka yanıt veremiyor.");
        }

        const cleanJson = responseText.replace(/```json|```/g, "").replace(/JSON/i, "").trim();
        let analysis;
        try {
            analysis = JSON.parse(cleanJson);
        } catch (e) {
            analysis = { isValid: false, analysisNote: "Veri ayrıştırma hatası." };
        }

        if (!analysis.isValid) return res.status(200).json({ success: false, error: analysis.analysisNote });

        const dbEntry = phoneDB[analysis.modelName.trim()];
        if (!dbEntry) return res.status(200).json({ success: false, error: "Model veritabanında bulunamadı." });

        // Fiyat ve Market Verisi
        const categoryKey = analysis.origin === "YurtDisi" ? "YurtDisi_IkinciEl" : "TR_IkinciEl";
        const marketValueStr = dbEntry[categoryKey] || dbEntry.TR_IkinciEl || Object.values(dbEntry)[0];
        const vMin = getMinPrice(marketValueStr);
        const pVal = parsePrice(analysis.price || initialPrice);

        // Dinamik Risk Hesaplama
        let finalScore = Math.max(15, parseInt(analysis.riskScore) || 20);
        const isAbnormal = (vMin > 0 && pVal > 0 && pVal < (vMin * 0.60));

        // Kurumsal Güven Filtresi
        if (analysis.isCorporate && analysis.yearsInSystem >= 15) {
            finalScore = isAbnormal ? 35 : 15;
        } else {
            if (!analysis.isParamGuvende) finalScore += 20;
            if (isAbnormal) finalScore = Math.max(75, finalScore + 40);
        }

        if (finalScore > 100) finalScore = 100;

        // Not Temizliği
        let finalNote = (analysis.analysisNote || "")
            .replace(/YurtDisi_IkinciEl/g, "Yurt Dışı İkinci El")
            .replace(/TR_IkinciEl/g, "Türkiye İkinci El")
            .replace(/isValid|%/g, "")
            .split('\n').map(line => line.trim()).join('\n').trim();

        const statusMap = [
            { limit: 30, label: "Oldukça Güvenli" },
            { limit: 50, label: "Dikkatli İncelenmeli" },
            { limit: 70, label: "Şüpheli İlan" },
            { limit: 100, label: "Yüksek Risk Seviyesi" }
        ];
        const finalStatus = statusMap.find(s => finalScore <= s.limit)?.label || "Bilinmeyen Durum";

        const newEntry = {
            model: analysis.modelName,
            price: analysis.price,
            marketValue: marketValueStr,
            riskScore: finalScore,
            status: finalStatus,
            reason: finalNote,
            imageUrl,
            time: new Date().toISOString()
        };

        if (db) {
            await db.collection('feed').insertOne(newEntry);
            const statsUpdate = { $inc: { globalAnalyses: 1 } };
            if (finalScore >= 50) statsUpdate.$inc.globalFrauds = 1;
            await db.collection('stats').updateOne({ id: 'global' }, statsUpdate, { upsert: true });
        }

        res.json({
            success: true,
            riskScore: finalScore,
            status: finalStatus,
            analysisNote: finalNote,
            modelName: analysis.modelName,
            price: analysis.price,
            marketValue: marketValueStr,
            imageUrl,
            analysisId: newEntry._id || "temp"
        });

    } catch (error) {
        console.error("ANALİZ HATASI:", error);
        res.json({ success: false, error: error.message.includes("Yapay zeka") ? error.message : "Teknik hata." });
    }
};

const getAnalysisById = async (req, res) => {
    try {
        const { db } = getDB();
        const item = await db.collection('feed').findOne({ _id: new ObjectId(req.params.id) });
        res.json(item ? { success: true, data: item } : { error: 'Bulunamadı.' });
    } catch (err) {
        res.status(400).json({ error: 'Geçersiz ID.' });
    }
};

const reportFraud = async (req, res) => res.json({ success: true });

module.exports = { analyzeProduct, getAnalysisById, reportFraud };