const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

// VERİ ENJEKSİYONU (SİSTEM ANAYASASI - phoneDB)
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
    "Samsung Galaxy Z Flip 7": { "TR_Sifir": "60.000 TL - 68.000 TL", "TR_IkinciEl": "48.000 TL - 55.000 TL", "YurtDisi_IkinciEl": "28.000 TL - 32.000 TL" }
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
        const prompt = `Bugün 28 Nisan 2026. Sen Piyasa.ai Analiz Motorusun. ŞU PROTOKOLÜ HARFİYEN UYGULA:

        1. VERİ KAYNAĞI: SADECE sana verilen ${JSON.stringify(phoneDB)} verilerini kullan. Eğer model veritabanında yoksa (Örn: Oppo A57, yeni bir model vb.), bunu "Yeni model, sınırlı veri" olarak işle ve veritabanındaki en yakın üst segmentle kıyasla. Kafandan fiyat uydurma.

        2. GÖRSEL ANALİZ: 
           - Arka plandaki diğer marka reklamları (iPhone tabelası, Samsung logosu vb.) mağaza ortamının doğal parçasıdır; risk artırıcı DEĞİLDİR. 
           - Kutunun üzerindeki marka/model yazısı ile ilan başlığı tutarlıysa bu GÜVEN artırıcıdır.
           - Görselde ekran, kamera, telefon gövdesi veya fiyat metni varsa bu bir TELEFONDUR.

        3. RİSK VE TON UYUMU (KESİN KURAL):
           - Risk asla %15'in altına düşmez.
           - %15 - %30: "Çok Güvenli / Mağaza İlanı". Metin çok olumlu ve güven verici olmalı.
           - %31 - %50: "Dikkatli İncelenmeli". Metin nötr ve bilgilendirici olmalı, "Yüksek risk" veya "Soru işareti" gibi korkutucu kelimeler ASLA kullanma.
           - %51 - %85: "Şüpheli İlan". 
           - %86 - %100: "Dolandırıcı Riski!".

        4. ANALİZ NOTU FORMATI:
           - Daima şu cümleyle başla: "İncelediğimiz ilandaki [Fiyat] TL'lik bedel, veritabanımızdaki [Aralık] TL bandındaki [Kategori] fiyatlarıyla kıyaslanmıştır."
           - Teknik terim (TR_IkinciEl vb.) YASAK. "Türkiye İkinci El", "Yurt Dışı Sıfır", "Yurt Dışı İkinci El" gibi temiz Türkçe kullan.

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
            analysis = { isValid: false, modelName: initialModel, price: initialPrice };
        }

        if (analysis.isValid === false) {
            return res.status(200).json({ success: false, error: "Analiz Yapılamadı: Lütfen sadece akıllı telefon ilanı görselleri yükleyin." });
        }

        // MANTIK VE VERİ TEMİZLİĞİ
        let finalModelName = (analysis.modelName || initialModel).trim();
        const dbEntry = phoneDB[finalModelName];
        let marketValueStr = analysis.marketValue || (dbEntry ? (dbEntry.TR_IkinciEl || Object.values(dbEntry)[0]) : "Veri Yok");
        
        const vMin = getMinPrice(marketValueStr);
        const pVal = parsePrice(analysis.price || initialPrice);

        // Fallback Logic (AI hata yaparsa veya veritabanında yoksa)
        let fallbackScore = 65;
        let pText = analysis.price || initialPrice;
        let fallbackNote = `İncelediğimiz ilandaki ${pText} TL'lik bedel, veritabanımızdaki ${marketValueStr} TL bandındaki piyasa değerleriyle kıyaslanmıştır. Fiyat piyasa normlarının dışında kaldığı için dolandırıcılık risklerine karşı temkinli olunmalıdır.`;

        if (vMin > 0) {
            if (pVal >= (vMin - 10) && pVal <= (vMin * 1.5)) {
                fallbackScore = 15;
                fallbackNote = `İncelediğimiz ilandaki ${pText} TL'lik bedel, veritabanımızdaki ${marketValueStr} TL bandındaki piyasa değerleriyle kıyaslanmıştır. Fiyat piyasa verileriyle tam uyum göstermekte olup çok güvenli ve makul bir profil çizmektedir.`;
            } else if (pVal < (vMin * 0.80)) {
                fallbackScore = 95;
                fallbackNote = `İncelediğimiz ilandaki ${pText} TL'lik bedel, veritabanımızdaki ${marketValueStr} TL bandındaki piyasa değerlerinin çok altında kalarak yüksek bir risk profili oluşturmaktadır.`;
            }
        }

        if (marketValueStr === "Veri Yok") {
            fallbackNote = "Bu model henüz sistemimize eklenmemiştir, yeni model verileri baz alınarak bir analiz gerçekleştirilmiştir.";
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
        if (finalScore >= 90) finalStatus = "Dolandırıcı Riski!";
        else if (finalScore >= 51) finalStatus = "Şüpheli İlan";
        else if (finalScore >= 31) finalStatus = "Dikkatli İncelenmeli";
        else finalStatus = "Çok Güvenli / Mağaza İlanı";

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