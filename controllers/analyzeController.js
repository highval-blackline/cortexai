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

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.1-flash-lite-preview",
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        });
        const prompt = `Sen Piyasa.ai Analiz Motorusun. ŞU KURALLARI UYGULA:

        1. VERİ: Sadece ${JSON.stringify(phoneDB)} listesini kullan.
        2. AKILLI ANALİZ: İlan fotoğrafındaki modeli tespit et, veritabanındaki fiyat aralığını bul.
        3. RAPOR DİLİ: Birinci tekil şahıs ("BEN") dili kullan (Örn: "İncelediğim", "Kıyasladım"). Kullanıcıya doğrudan tavsiye ver (Örn: "Temkinli olmalısın").
        4. ZORUNLU İÇERİK: Metne mutlaka "İncelediğim [Fiyat] TL'lik [Model], veritabanımdaki [Min] TL - [Max] TL aralığıyla kıyasladım" cümlesiyle başla.
        5. YASAK: Metin içerisinde hesaplanan risk puanını (Örn: "Risk puanını 15 belirledim") ASLA söyleme. Skor zaten UI'da görünüyor.
        6. FORMAT: "Güvenli Alım İçin Uygulama Adımları:" başlığından önce bir adet satır sonu (\n), her maddeden (1., 2., 3.) önce ise birer adet satır sonu (\n) kullan.

        Yanıtı SADECE geçerli bir JSON olarak ver. Metin alanları (analysisNote) içerisinde satır sonları için mutlaka \n karakterini kullan:
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

        // URL'den Resim Çekme (Eğer dosya yoksa)
        if (!fileBuffer && imageUrl && imageUrl.startsWith('http')) {
            try {
                const imgResp = await fetch(imageUrl);
                const arrayBuffer = await imgResp.arrayBuffer();
                fileBuffer = Buffer.from(arrayBuffer);
                mimeType = imgResp.headers.get('content-type') || "image/jpeg";
            } catch (err) {
                console.error("URL Resim Çekme Hatası:", err);
            }
        }

        const aiParts = [{ text: prompt }];
        if (fileBuffer) {
            aiParts.push({ inlineData: { data: fileBuffer.toString("base64"), mimeType: mimeType || "image/jpeg" } });
        }

        let responseText = "";
        try {
            const result = await model.generateContent(aiParts);
            const response = await result.response;
            
            // Yanıt bloklandı mı kontrolü
            if (response.promptFeedback && response.promptFeedback.blockReason) {
                throw new Error(`Yapay zeka içeriği engelledi: ${response.promptFeedback.blockReason}`);
            }
            
            responseText = response.text();
        } catch (err) {
            console.error("AI ÜRETİM HATASI:", err);
            const detail = err.message || "";
            throw new Error(`Yapay zeka yanıt veremiyor: ${detail.substring(0, 50)}`);
        }

        // JSON Temizleme: Literal satır sonlarını ve kontrol karakterlerini temizle
        let sanitizedText = responseText
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Görünmez kontrol karakterlerini sil
            .trim();

        const jsonMatch = sanitizedText.match(/\{[\s\S]*\}/);
        let cleanJson = jsonMatch ? jsonMatch[0] : sanitizedText;

        // Eksik kapanış parantezi kontrolü (Basit onarım)
        if (cleanJson.startsWith("{") && !cleanJson.endsWith("}")) {
            cleanJson += "}";
        }
        
        let analysis;
        try {
            analysis = JSON.parse(cleanJson);
        } catch (e) {
            console.error("JSON Parse Hatası. Ham Yanıt:", responseText);
            // Daha agresif temizlik dene: Çift tırnaklar içindeki satır sonlarını temizle
            try {
                const veryCleanJson = cleanJson.replace(/\n/g, " ").replace(/\r/g, " ");
                analysis = JSON.parse(veryCleanJson);
            } catch (e2) {
                analysis = { isValid: false, analysisNote: `Veri ayrıştırma hatası: AI yanıtı geçersiz JSON. Yanıt: ${responseText.substring(0, 100)}` };
            }
        }

        if (!analysis.isValid) return res.status(200).json({ success: false, error: analysis.analysisNote });

        // Mantıksal Model Eşleştirme (Gelişmiş)
        let finalModelName = (analysis.modelName || initialModel).trim();
        let dbEntry = phoneDB[finalModelName];

        if (!dbEntry) {
            const detectedLower = finalModelName.toLowerCase();
            const matchingKey = Object.keys(phoneDB).find(key => {
                const keyLower = key.toLowerCase();
                // "POCO X5 Pro / X5" anahtarı "POCO X5 Pro"yu içermeli
                return keyLower.includes(detectedLower);
            });
            
            if (matchingKey) {
                dbEntry = phoneDB[matchingKey];
                finalModelName = matchingKey; // Veritabanı anahtarına normalize et
            }
        }

        if (!dbEntry) return res.status(200).json({ success: false, error: "Bu model henüz veritabanımızda yer almıyor." });

        // Fiyat ve Market Verisi
        const categoryKey = analysis.origin === "YurtDisi" ? "YurtDisi_IkinciEl" : "TR_IkinciEl";
        const marketValueStr = dbEntry[categoryKey] || dbEntry.TR_IkinciEl || Object.values(dbEntry)[0];

        // AI zaten akıllı bir skor üretiyor, biz sadece kurumsal güvene göre ufak bir kalibrasyon yapalım
        let finalScore = parseInt(analysis.riskScore) || 20;
        
        // Eğer AI kurumsal olduğunu görmüşse ama skoru çok yüksekse (hata payı), kurumsal güvende puanı kır.
        if (analysis.isCorporate && finalScore > 40) {
            finalScore = 35; 
        }

        if (finalScore > 100) finalScore = 100;

        let finalNote = (analysis.analysisNote || "")
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
            model: finalModelName,
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