const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

// VERİ ENJEKSİYONU (ANAYASA - KESİN KAYNAK)
const phoneDB = {
    "iPhone 17 Pro Max": { "TR_Sifir": "115.000 TL - 125.000 TL", "TR_IkinciEl": "105.000 TL - 115.000 TL", "YurtDisi_IkinciEl": "55.000 TL - 65.000 TL" },
    "iPhone 17 Pro": { "TR_Sifir": "100.000 TL - 110.000 TL", "TR_IkinciEl": "90.000 TL - 100.000 TL", "YurtDisi_IkinciEl": "45.000 TL - 55.000 TL" },
    "iPhone 16 Pro Max": { "TR_Sifir": "95.000 TL - 105.000 TL", "TR_IkinciEl": "85.000 TL - 95.000 TL", "YurtDisi_IkinciEl": "42.000 TL - 48.000 TL" },
    "iPhone 16 Pro": { "TR_Sifir": "85.000 TL - 95.000 TL", "TR_IkinciEl": "75.000 TL - 85.000 TL", "YurtDisi_IkinciEl": "35.000 TL - 40.000 TL" },
    "Samsung Galaxy S26 Ultra": { "TR_Sifir": "105.000 TL - 115.000 TL", "TR_IkinciEl": "95.000 TL - 100.000 TL", "YurtDisi_IkinciEl": "48.000 TL - 53.000 TL" },
    "Samsung Galaxy S25 Ultra": { "TR_Sifir": "90.000 TL - 98.000 TL", "TR_IkinciEl": "78.000 TL - 85.000 TL", "YurtDisi_IkinciEl": "45.000 TL - 50.000 TL" },
    "Samsung Galaxy S25": { "TR_Sifir": "60.000 TL - 66.000 TL", "TR_IkinciEl": "48.000 TL - 55.000 TL", "YurtDisi_IkinciEl": "30.000 TL - 34.000 TL" },
    "Samsung Galaxy S24 Ultra": { "TR_Sifir": "70.000 TL - 76.000 TL", "TR_IkinciEl": "58.000 TL - 65.000 TL", "YurtDisi_IkinciEl": "28.000 TL - 33.000 TL" },
    "Samsung Galaxy Z Fold 7": { "TR_Sifir": "95.000 TL - 105.000 TL", "TR_IkinciEl": "80.000 TL - 88.000 TL", "YurtDisi_IkinciEl": "42.000 TL - 48.000 TL" },
    "Samsung Galaxy Z Flip 7": { "TR_Sifir": "60.000 TL - 68.000 TL", "TR_IkinciEl": "48.000 TL - 55.000 TL", "YurtDisi_IkinciEl": "28.000 TL - 32.000 TL" },
    "Samsung Galaxy Z Fold 6": { "TR_Sifir": "80.000 TL - 88.000 TL", "TR_IkinciEl": "65.000 TL - 72.000 TL", "YurtDisi_IkinciEl": "34.000 TL - 39.000 TL" }
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
        const prompt = `Bugün 28 Nisan 2026. Sen Piyasa.ai için "Anayasal Piyasa Denetçisi"sin. 
        
        GÖREVİN VE KESİN KURALLAR:
        1. VERİ ANAYASASI: SADECE sana verilen ${JSON.stringify(phoneDB)} verilerini kullan. Kendi genel piyasa tahminlerini kullanman KESİNLİKLE YASAKTIR. 
        2. AKILLI TANIMA: Görselde telefon hatları, ekran, kamera lensi veya "Samsung", "S25", "A57", "iPhone", "Fiyat" gibi metinler varsa analizi DURDURMA. "isValid": false uyarısını sadece %100 emin olduğun telefon dışı (araba, kedi, manzara vb.) görsellerde kullan.
        3. ŞEFFAFLIK: Analiz notuna DAİMA şu cümleyle başla: "İlandaki [Fiyat] TL, veritabanımızdaki [Kategori] aralığı olan [Fiyat Aralığı] TL ile kıyaslanmıştır."
        4. MODEL YOKSA: Model database'de yoksa "Bu model henüz sistemimize eklenmemiştir" de ve analizi bitir.
        5. FORMAT: Profesyonel, doğal, kod terimsiz (Vmin vb. yasak) TEK BİR PARAGRAF.

        Yanıtı SADECE şu JSON formatında ver: 
        {
          "isValid": true,
          "modelName": "...", 
          "price": "...",
          "marketValue": "...",
          "riskScore": 15,
          "analysisNote": "İlandaki ... TL, veritabanımızdaki ... aralığı olan ... TL ile kıyaslanmıştır. [Devamı...]"
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

        // Fallback Risk Hesaplama
        let fallbackScore = 65;
        let pText = analysis.price || initialPrice;
        let fallbackNote = `İlandaki ${pText} TL, veritabanımızdaki piyasa aralığı olan ${marketValueStr} TL ile kıyaslanmıştır. Fiyat piyasa ortalamasının altında seyrettiği için temkinli olunmalı, işlemler güvenli ödeme yöntemleriyle tamamlanmalıdır.`;

        if (vMin > 0) {
            // Hassas Eşleştirme (Z Fold 7 örneği gibi 5 TL tolerans)
            if (pVal >= (vMin - 10) && pVal <= (vMin * 1.5)) {
                fallbackScore = 15;
                fallbackNote = `İlandaki ${pText} TL, veritabanımızdaki piyasa aralığı olan ${marketValueStr} TL ile kıyaslanmıştır. Fiyat piyasa verileriyle tam uyum göstermekte olup makul ve güven verici bir profil çizmektedir.`;
            } else if (pVal < (vMin * 0.80)) {
                fallbackScore = 95;
                fallbackNote = `İlandaki ${pText} TL, veritabanımızdaki piyasa aralığı olan ${marketValueStr} TL ile kıyaslanmıştır. Fiyat piyasa normlarının çok altında kaldığı için yüksek risk taşımaktadır.`;
            }
        }

        if (marketValueStr === "Veri Yok") {
            fallbackNote = "Bu model henüz sistemimize eklenmemiştir, analiz genel güvenlik kriterlerine göre yapılmıştır.";
        }

        const finalScore = Math.max(15, analysis.riskScore || fallbackScore);
        let finalNote = (analysis.analysisNote || fallbackNote)
            .replace(/YurtDisi_IkinciEl/g, "yurt dışı ikinci el")
            .replace(/TR_IkinciEl/g, "Türkiye ikinci el")
            .replace(/TR_Sifir/g, "Türkiye sıfır")
            .trim();

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