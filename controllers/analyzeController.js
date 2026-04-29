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
        const prompt = `Sen Piyasa.ai'nın en gelişmiş Analiz Motorusun. Görseldeki ilan verilerini ve aşağıdaki veritabanını kullanarak KESİN ve KATI kurallara bağlı bir risk analizi yapmalısın.

VERİTABANI: ${JSON.stringify(phoneDB)}

ANALİZ KURALLARI (KRİTİK):
1. ÇIKTI FORMATI: Yanıt SADECE ham JSON olmalıdır. Markdown kod blokları ( \`\`\`json ), "JSON:" ön eki veya herhangi bir ekstra açıklama metni ASLA kullanılmayacaktır.
2. RİSK HESAPLAMA (Fiyat Odaklı): İlan fiyatı, veritabanındaki piyasa ortalamasının (Second Hand TR/Yurt Dışı) altındaysa risk skoru eksponansiyel olarak YÜKSELTİLECEKTİR. Çok düşük fiyat her zaman yüksek dolandırıcılık veya gizli kusur sinyalidir.
3. HESAP YAŞI ETKİSİ: Satıcı hesabı yeniyse (0-6 ay) ve fiyat piyasanın çok altındaysa, risk skoru direkt %80-%100 aralığına çekilmelidir.
4. METİN ANALİZİ (NLP): 
   - İlanda "yurtdışı", "önce havale", "acil nakit", "el elden", "açıklamayı oku" gibi şüpheli ibareler risk skorunu artırır.
   - Satıcı "kılcal çizik", "ekran değişimi", "kasa vuruğu" gibi şeffaf kusur detayları vermişse, bu durum dürüstlük göstergesi kabul edilmeli, düşük fiyatın nedeni netleştiği için risk skoru normalize edilmelidir.
5. GÜVENCE SİSTEMLERİ: "Param Güvende" gibi sistemlerin varlığı finansal riski düşürür; bu durumda analiz notunda sadece kargo kontrolü ve fiziki inceleme tavsiye edilmelidir.
6. ANALİZ NOTU (analysisNote): Raporun profesyonel, çelişkisiz ve net olmalıdır. Kullanıcıya fiyatın neden riskli veya güvenli olduğunu teknik verilere dayanarak (Örn: "Piyasanın %30 altında olması şüphelidir") açıkla.

JSON ŞABLONU (Birebir uyulmalıdır):
{
  "isValid": true,
  "modelName": "Ürün Adı",
  "price": "İlan Fiyatı",
  "origin": "TR" | "YurtDisi",
  "isParamGuvende": true | false,
  "isCorporate": true | false,
  "yearsInSystem": 0,
  "riskScore": 0,
  "analysisNote": "Detaylı profesyonel rapor..."
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
            { limit: 39, label: "Güvenli" },
            { limit: 80, label: "Şüpheli / Dikkatli İncelenmeli" },
            { limit: 100, label: "Yüksek Risk / Dolandırıcı" }
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
            if (finalScore > 80) statsUpdate.$inc.globalFrauds = 1;
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