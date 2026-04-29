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

        1. VERİ KAYNAĞI VE ANALİZ: 
           - SADECE sana verilen ${JSON.stringify(phoneDB)} verilerini kullan.
           - İlan görsellerinden "Alındığı Yer", "Garanti" ve "Açıklama" kısımlarını dikkatle incele.
           - Eğer ilanda "Yurt dışı", "Kayıtsız", "Global" veya "İthalatçı Garantili" ibaresi varsa, bu cihazı "Yurt Dışı" kategorisinde değerlendir.
           - Eğer model bu listede YOKSA, analizi "isValid: false" olarak işaretle.

        2. GÜVEN ÇARPANLARI VE FİLTRELER:
           - "Param Güvende" ibaresi varsa: Mevcut risk puanından 10 puan düş.
           - Eğer ilanda "Param Güvende ile gönderim yapmamaktadır" veya benzeri bir uyarı/işaret varsa: Mevcut risk puanına 15-20 puan EKLE (Elden teslimat zorunluluğu riski).
           - Satıcı "Mağaza" veya "Kurumsal" ise: Mevcut risk puanından 10 puan düş.

        3. FİYAT VE RİSK DENGESİ:
           - Fiyat analizi yaparken cihazın kökenine (TR veya Yurt Dışı) göre doğru veriyi baz al.
           - Eğer cihaz Yurt Dışı ise ve fiyatı Yurt Dışı piyasasının üzerindeyse, "Uçurum Fiyat" uyarısı verme; makul/yüksek olarak değerlendir.

        4. RİSK VE TON UYUMU:
           - Risk asla %15'in altına düşmez.
           - %15 - %30: "Oldukça Güvenli". 
           - %86 - %100: "Dolandırıcı Riski!".

        5. ANALİZ NOTU FORMATI (MASTER DEDEKTİF KURALLARI):
           - "Yüzde (%)" ifadelerini ASLA kullanma.
           - Metne şu şablonla başla: "İncelediğimiz [İlan_Fiyatı] TL'lik [Model_İsmi], [Piyasa_Aralığı] bandındaki [Kategori] piyasasına göre [Analiz_Sonucu]..."
           - Satıcı bilgilerini (Örn: "12 yıllık kurumsal mağaza" veya "Eski üyelik") tespit edebildiysen metne işle.
           - Metnin sonuna mutlaka iki alt satır boşluk bırakarak (\n\n) "Güvenli Alım İçin Uygulama Adımları:" başlığını ekle.
           - Maddeleri şu şekilde her biri yeni bir satırda (\n) olacak şekilde sırala:
             \n1- e-Devlet üzerinden IMEI sorgulaması yapın.
             \n2- Cihazın donanımsal müdahale (direnç kaydı vb.) durumunu mutlaka sorgulayın.
             \n3- Ürünü görüntülü arama ile teyit edin ve yüz yüze alışverişi tercih edin.
           - Tek bir profesyonel hibrit paragraf ve ardından bu listeyi yaz. Metnin başında boşluk bırakma.

        Yanıtı SADECE şu JSON formatında ver: 
        {
          "isValid": true,
          "modelName": "...", 
          "price": "...",
          "origin": "TR" | "YurtDisi",
          "isParamGuvende": true | false,
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

        // Veritabanından o modele ait güncel piyasa aralığını al (Origin'e göre)
        let categoryKey = (analysis.origin === "YurtDisi") ? "YurtDisi_IkinciEl" : "TR_IkinciEl";
        let marketValueStr = dbEntry[categoryKey] || dbEntry.TR_IkinciEl || Object.values(dbEntry)[0];
        
        const vMin = getMinPrice(marketValueStr);
        const pVal = parsePrice(analysis.price || initialPrice);

        // Fallback Risk Hesaplama
        let fallbackScore = 65;
        let pText = analysis.price || initialPrice;
        const categoryLabel = (analysis.origin === "YurtDisi") ? "Yurt Dışı İkinci El" : "Türkiye İkinci El";

        let fallbackNote = `İncelediğimiz ${pText} TL'lik ${finalModelName}, ${marketValueStr} bandındaki ${categoryLabel} piyasasına göre analiz edilmiştir. Cihazın ${categoryLabel.toLowerCase()} olması nedeniyle fiyat piyasa normlarının dışında kalmaktadır.`;

        if (vMin > 0) {
            if (pVal >= (vMin - 10) && pVal <= (vMin * 1.5)) {
                fallbackScore = 20;
                fallbackNote = `İncelediğimiz ${pText} TL'lik ${finalModelName}, ${marketValueStr} bandındaki ${categoryLabel} piyasasıyla uyumlu görünmektedir.`;
            } else if (pVal < (vMin * 0.80)) {
                fallbackScore = 95;
                fallbackNote = `İncelediğimiz ${pText} TL'lik ${finalModelName}, ${marketValueStr} bandındaki ${categoryLabel} piyasasına göre çok düşük fiyatlanmıştır. Bu durum ciddi bir güvenlik riski oluşturmaktadır.`;
            }
        }

        // ANORMAL FİYAT SAPMASI KONTROLÜ
        let isAbnormalDeviation = false;
        if (vMin > 0 && pVal > 0 && pVal < (vMin * 0.60)) {
            isAbnormalDeviation = true;
        }

        let finalScore = Math.max(15, parseInt(analysis.riskScore) || fallbackScore);
        
        // Param Güvende yoksa ek risk
        if (analysis.isParamGuvende === false) {
            finalScore = Math.min(100, finalScore + 20);
        }

        if (isAbnormalDeviation) {
            finalScore = Math.max(60, finalScore + 40);
            if (finalScore > 100) finalScore = 100;
        }

        let finalNote = (analysis.analysisNote || fallbackNote)
            .replace(/YurtDisi_IkinciEl/g, "Yurt Dışı İkinci El")
            .replace(/TR_IkinciEl/g, "Türkiye İkinci El")
            .replace(/TR_Sifir/g, "Türkiye Sıfır")
            .replace(/YurtDisi_Sifir/g, "Yurt Dışı Sıfır")
            .replace(/isValid/g, "")
            .replace(/%\d+|%\s*\d+|\d+\s*%/g, "") // Her ihtimale karşı yüzde ifadelerini temizle
            .split('\n').map(line => line.trim()).join('\n') // Her satırın başındaki ve sonundaki boşlukları temizle
            .trim();

        if (isAbnormalDeviation) {
            const deviationWarning = "DİKKAT: İlan fiyatı piyasa ortalamasının çok altında tespit edilmiştir. Bu durum genellikle ağır hasarlı, yurt dışı kayıtlı olmayan veya dolandırıcılık amaçlı ilanlarda görülür.";
            if (!finalNote.includes("piyasa ortalamasının çok altında")) {
                finalNote = deviationWarning + " " + finalNote;
            }
        }

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

        if (db) {
            await db.collection('feed').insertOne(newEntry);

            // Global istatistikleri güncelle (+1 Taranan İlan ve +1 Dolandırıcı (eğer riskliyse))
            const updateDoc = { $inc: { globalAnalyses: 1 } };
            if (finalScore >= 50) updateDoc.$inc.globalFrauds = 1;
            
            await db.collection('stats').updateOne({ id: 'global' }, updateDoc, { upsert: true });
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
            analysisId: newEntry._id || "temporary_id"
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