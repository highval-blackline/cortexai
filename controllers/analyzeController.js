const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');
const phoneDB = require('../database.js'); // Sabit phoneDB kaldırıldı, database.js bağlandı.

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
        const db = dbConnection.db; // Değişken çakışmasını önlemek için standart yapı
        
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
        const prompt = `Bugün 29 Nisan 2026. Sen Piyasa.ai Analiz Motorusun. ŞU PROTOKOLÜ HARFİYEN UYGULA:

        1. VERİ KAYNAĞI: SADECE sana verilen ${JSON.stringify(phoneDB)} verilerini kullan. Eğer model bu listede YOKSA (Örn: Oppo A57 vb.), analizi "isValid: false" olarak işaretle ve şu notu yaz: "Bu model güncel veritabanımızda henüz yer almadığı için kesin bir fiyat analizi yapılamıyor."

        2. GÜVEN ÇARPANLARI (RİSK DÜŞÜRENLER):
           - İlanda "Param Güvende" ibaresi tespit edilirse: Mevcut risk puanından 5-10 puan düş.
           - Satıcı "Mağaza" veya "Kurumsal" bir profilse: Mevcut risk puanından 10 puan düş.
           - İlanda açık "Adres" veya "Sabit Telefon" gibi mağaza detayları varsa: Mevcut risk puanından 5 puan düş.

        3. RİSK VE TON UYUMU (KESİN KURAL):
           - Risk asla %15'in altına düşmez.
           - %15 - %30: "Oldukça Güvenli". Metin olumlu ve güven verici olmalı.
           - %31 - %50: "Dikkatli İncelenmeli". Metin nötr ve bilgilendirici olmalı.
           - %86 - %100: "Dolandırıcı Riski!".

        4. ANALİZ NOTU FORMATI:
           - Daima şu cümleyle başla: "İncelediğimiz ilandaki [Fiyat] TL'lik bedel, veritabanımızdaki [Aralık] TL bandındaki [Kategori] fiyatlarıyla kıyaslanmıştır."
           - Teknik terim (TR_IkinciEl vb.) YASAK. "Türkiye İkinci El", "Türkiye Sıfır", "Yurt Dışı Sıfır", "Yurt Dışı İkinci El" kullan.
           - Tek bir profesyonel paragraf yaz.

        Yanıtı SADECE şu JSON formatında ver: 
        {
          "isValid": true,
          "modelName": "...", 
          "price": "...",
          "marketValue": "...",
          "riskScore": 15,
          "analysisNote": "..."
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
            analysis = { isValid: false, modelName: initialModel, price: initialPrice, analysisNote: "Analiz sırasında bir hata oluştu." };
        }

        // MODEL YOKSA VEYA GEÇERSİZSE
        if (analysis.isValid === false) {
            const errorMsg = analysis.analysisNote || "Bu model güncel veritabanımızda henüz yer almadığı için kesin bir fiyat analizi yapılamıyor.";
            return res.status(200).json({ success: false, error: errorMsg });
        }

        // MANTIK VE VERİ TEMİZLİĞİ
        let finalModelName = (analysis.modelName || initialModel).trim();
        const dbEntry = phoneDB[finalModelName];

        // Eğer AI yanılıp listede olmayan bir modeli geçerli saydıysa (Extra Kontrol)
        if (!dbEntry) {
            return res.status(200).json({ success: false, error: "Bu model güncel veritabanımızda henüz yer almadığı için kesin bir fiyat analizi yapılamıyor." });
        }

        let marketValueStr = analysis.marketValue || (dbEntry.TR_IkinciEl || Object.values(dbEntry)[0]);
        const vMin = getMinPrice(marketValueStr);
        const pVal = parsePrice(analysis.price || initialPrice);

        // Fallback Risk Hesaplama
        let fallbackScore = 65;
        let pText = analysis.price || initialPrice;
        let fallbackNote = `İncelediğimiz ilandaki ${pText} TL'lik bedel, veritabanımızdaki ${marketValueStr} TL bandındaki piyasa değerleriyle kıyaslanmıştır. Fiyat piyasa normlarının dışında kaldığı için dolandırıcılık risklerine karşı temkinli olunmalıdır.`;

        if (vMin > 0) {
            if (pVal >= (vMin - 10) && pVal <= (vMin * 1.5)) {
                fallbackScore = 20;
                fallbackNote = `İncelediğimiz ilandaki ${pText} TL'lik bedel, veritabanımızdaki ${marketValueStr} TL bandındaki piyasa değerleriyle kıyaslanmıştır. Fiyat piyasa verileriyle tam uyum göstermekte olup oldukça güvenli ve makul bir profil çizmektedir.`;
            } else if (pVal < (vMin * 0.80)) {
                fallbackScore = 95;
                fallbackNote = `İncelediğimiz ilandaki ${pText} TL'lik bedel, veritabanımızdaki ${marketValueStr} TL bandındaki piyasa değerlerinin çok altında kalarak yüksek bir risk profili oluşturmaktadır.`;
            }
        }

        const finalScore = Math.max(15, analysis.riskScore || fallbackScore);
        let finalNote = (analysis.analysisNote || fallbackNote)
            .replace(/YurtDisi_IkinciEl/g, "Yurt Dışı İkinci El")
            .replace(/TR_IkinciEl/g, "Türkiye İkinci El")
            .replace(/TR_Sifir/g, "Türkiye Sıfır")
            .replace(/YurtDisi_Sifir/g, "Yurt Dışı Sıfır")
            .replace(/isValid/g, "")
            .trim();

        let finalStatus = "Şüpheli İlan";
        if (finalScore >= 86) finalStatus = "Dolandırıcı Riski!";
        else if (finalScore >= 51) finalStatus = "Şüpheli İlan";
        else if (finalScore >= 31) finalStatus = "Dikkatli İncelenmeli";
        else finalStatus = "Oldukça Güvenli";

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

        await db.collection('feed').insertOne(newEntry);

        if (finalScore >= 50) {
            await db.collection('stats').updateOne({ id: 'global' }, { $inc: { globalFrauds: 1 } }, { upsert: true });
        }

        return res.status(200).json({ 
            success: true, 
            riskScore: finalScore, 
            status: finalStatus,
            analysisNote: finalNote, 
            modelName: finalModelName,
            price: newEntry.price,
            marketValue: marketValueStr,
            imageUrl,
            analysisId: newEntry._id
        });

    } catch (error) {
        console.error("HATA:", error);
        return res.status(200).json({ success: false, error: "Teknik bir hata oluştu, lütfen tekrar deneyin." });
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