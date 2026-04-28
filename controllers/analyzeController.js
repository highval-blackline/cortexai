const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

// VERİ ENJEKSİYONU (ZORUNLU - Vercel Filesystem hatalarını engellemek için)
const phoneDB = {
    "iPhone 17 Pro Max": { "TR_IkinciEl": "105.000 TL - 115.000 TL", "YurtDisi_IkinciEl": "55.000 TL - 65.000 TL" },
    "iPhone 17 Pro": { "TR_IkinciEl": "90.000 TL - 100.000 TL", "YurtDisi_IkinciEl": "45.000 TL - 55.000 TL" },
    "iPhone 16 Pro Max": { "TR_IkinciEl": "85.000 TL - 95.000 TL", "YurtDisi_IkinciEl": "42.000 TL - 48.000 TL" },
    "iPhone 16 Pro": { "TR_IkinciEl": "75.000 TL - 85.000 TL", "YurtDisi_IkinciEl": "35.000 TL - 40.000 TL" },
    "iPhone 15 Pro Max": { "TR_IkinciEl": "70.000 TL - 80.000 TL", "YurtDisi_IkinciEl": "32.000 TL - 38.000 TL" },
    "iPhone 15 Pro": { "TR_IkinciEl": "60.000 TL - 70.000 TL", "YurtDisi_IkinciEl": "28.000 TL - 33.000 TL" },
    "iPhone 14 Pro Max": { "TR_IkinciEl": "55.000 TL - 65.000 TL", "YurtDisi_IkinciEl": "25.000 TL - 30.000 TL" },
    "Samsung Galaxy S26 Ultra": { "TR_IkinciEl": "95.000 TL - 100.000 TL", "YurtDisi_IkinciEl": "48.000 TL - 53.000 TL" },
    "Samsung Galaxy S26": { "TR_IkinciEl": "62.000 TL - 68.000 TL", "YurtDisi_IkinciEl": "32.000 TL - 36.000 TL" },
    "Samsung Galaxy S25 Ultra": { "TR_IkinciEl": "78.000 TL - 85.000 TL", "YurtDisi_IkinciEl": "38.000 TL - 43.000 TL" },
    "Samsung Galaxy S25": { "TR_IkinciEl": "50.000 TL - 56.000 TL", "YurtDisi_IkinciEl": "26.000 TL - 29.000 TL" },
    "Samsung Galaxy S24 Ultra": { "TR_IkinciEl": "58.000 TL - 65.000 TL", "YurtDisi_IkinciEl": "28.000 TL - 33.000 TL" },
    "Samsung Galaxy S24": { "TR_IkinciEl": "38.000 TL - 44.000 TL", "YurtDisi_IkinciEl": "19.000 TL - 23.000 TL" },
    "Samsung Galaxy S23 Ultra": { "TR_IkinciEl": "45.000 TL - 52.000 TL", "YurtDisi_IkinciEl": "22.000 TL - 26.000 TL" }
};

// Yardımcı Araçlar
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

// API Yapılandırması
const geminiKey = process.env.GEMINI_API_KEY || "";
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const analyzeProduct = async (req, res) => {
    try {
        if (!genAI) throw new Error("AI Key Missing");

        const dbConnection = getDB();
        const db = dbConnection.db;
        
        let initialModel = req.body.title || req.body.model || "Bilinmeyen Cihaz";
        let initialPrice = req.body.price || "Belirtilmedi";

        let imageUrl = req.body.imageUrl || ""; 
        let fileBuffer = null;
        let mimeType = null;

        if (req.files && req.files.length > 0) {
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
        }

        const aiModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
        const prompt = `Bugün 28 Nisan 2026. Sen Piyasa.ai için "İçerik Filtreleme ve Analiz Uzmanı"sın.
        
        GÖREVİN VE KESİN KURALLAR:
        1. ŞEFFAF VERİ GÖSTERİMİ: Analiz Notu'nun (analysisNote) en başında mutlaka şu metni yaz: "Tespit Edilen Fiyat: [Fiyat] TL | Referans Piyasa Değeri: [Aralık] TL"
        2. MATEMATİKSEL TUTARLILIK: Eğer ilan Yurt Dışı (kayıtsız, IMEI vb.) ise mutlaka YurtDisi_IkinciEl fiyatlarını baz al. S24 Ultra 27.999 TL ise ve Yurt Dışı kategorisindeyse bu fiyat piyasa sınırındadır, risk puanını düşük tut (%15-20).
        3. RİSK HESAPLAMA: Sadece fiyat piyasa alt sınırının (Vmin) %20 ve daha altına düştüğünde agresif risk (%85+) ver. Sınırdaki fiyatlara "Piyasa sınırında/makul" de.
        4. REFERANS VERİTABANI: ${JSON.stringify(phoneDB)}

        Yanıtı SADECE şu JSON formatında ver: 
        {
          "isValid": true,
          "modelName": "Samsung Galaxy S24 Ultra", 
          "price": "27.999 TL",
          "marketValue": "28.000 TL - 33.000 TL",
          "riskScore": 15,
          "analysisNote": "Tespit Edilen Fiyat: 27.999 TL | Referans Piyasa Değeri: 28.000 TL - 33.000 TL ... [Analiz]"
        }`;

        const aiParts = [prompt];
        if (fileBuffer) {
            aiParts.push({ inlineData: { data: fileBuffer.toString("base64"), mimeType: mimeType } });
        }

        const aiResult = await aiModel.generateContent(aiParts);
        const response = await aiResult.response;
        const responseText = response.text();
        const cleanJson = responseText.replace(/```json|```/g, "").replace(/JSON/i, "").trim();
        
        let analysis;
        try {
            analysis = JSON.parse(cleanJson);
        } catch (e) {
            analysis = { isValid: false, modelName: initialModel, price: initialPrice };
        }

        // İÇERİK FİLTRELEME (ZORUNLU)
        if (analysis.isValid === false) {
            return res.status(200).json({ 
                success: false, 
                riskScore: 0,
                error: "Analiz Yapılamadı: Lütfen sadece akıllı telefon ilanı görselleri yükleyin. Sistemimiz şu an diğer kategorileri desteklememektedir." 
            });
        }

        // UI TEMİZLİĞİ VE MANTIK
        let finalModelName = (analysis.modelName || initialModel)
            .replace(/Analiz:\s*/i, "")
            .replace(/Şüpheli İlan Taraması\s*/i, "")
            .replace(/Taraması:\s*/i, "")
            .trim();

        const dbEntry = phoneDB[finalModelName];
        let marketValueStr = analysis.marketValue || (dbEntry ? (dbEntry.TR_IkinciEl || Object.values(dbEntry)[0]) : "Veri Yok");
        
        const vMin = getMinPrice(marketValueStr);
        const pVal = parsePrice(analysis.price || initialPrice);

        // Fallback Risk Hesaplama (AI Çuvallarsa)
        let fallbackScore = 60;
        let fallbackNote = `Tespit Edilen Fiyat: ${analysis.price || initialPrice} | Referans Piyasa Değeri: ${marketValueStr} \n\n Fiyat piyasa ortalamasının altında, dikkatli olmanız önerilir.`;

        if (vMin > 0) {
            if (pVal < (vMin * 0.80)) {
                fallbackScore = 95;
                fallbackNote = `Tespit Edilen Fiyat: ${analysis.price || initialPrice} | Referans Piyasa Değeri: ${marketValueStr} \n\n Piyasa değerinin çok altında, dolandırıcılık riski yüksek.`;
            } else if (pVal >= (vMin * 0.94)) {
                fallbackScore = 15;
                fallbackNote = `Tespit Edilen Fiyat: ${analysis.price || initialPrice} | Referans Piyasa Değeri: ${marketValueStr} \n\n Fiyat piyasa değerleriyle uyumlu, diğer detayları inceleyin.`;
            }
        }

        const finalScore = analysis.riskScore || fallbackScore;
        let finalNote = analysis.analysisNote || fallbackNote;
        
        // ŞEFFAF VERİ KONTROLÜ (Analiz notunun başında yoksa ekle)
        const transparencyHeader = `Tespit Edilen Fiyat: ${analysis.price || initialPrice} | Referans Piyasa Değeri: ${marketValueStr}`;
        if (!finalNote.includes("Tespit Edilen Fiyat")) {
            finalNote = transparencyHeader + " \n\n " + finalNote;
        }

        const finalStatus = finalScore >= 90 ? "Dolandırıcı Riski!" : (finalScore >= 40 ? "Şüpheli İlan" : "Güvenli / Uygun");

        const newEntry = {
            model: finalModelName,
            price: analysis.price || initialPrice,
            marketValue: marketValueStr,
            riskScore: finalScore,
            status: finalStatus,
            reason: finalNote,
            imageUrl,
            time: new Date().toISOString()
        };

        const feedCollection = db.collection('feed');
        const insertResult = await feedCollection.insertOne(newEntry);

        if (finalScore >= 50) {
            const statsCollection = db.collection('stats');
            await statsCollection.updateOne({ id: 'global' }, { $inc: { globalFrauds: 1 } }, { upsert: true });
        }

        return res.status(200).json({ 
            success: true, 
            riskScore: finalScore, 
            status: finalStatus,
            analysisNote: finalNote, 
            modelName: finalModelName,
            price: newEntry.price,
            marketValue: marketValueStr,
            imageUrl 
        });

    } catch (error) {
        console.error("Analiz Hatası:", error);
        return res.status(200).json({ 
            success: false, 
            modelName: "Bilinmeyen Cihaz", 
            price: "Belirtilmedi", 
            marketValue: "Veri Yok", 
            riskScore: 0, 
            analysisNote: "Analiz tamamlanamadı." 
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