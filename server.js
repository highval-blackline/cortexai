const express = require('express');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const cors = require('cors');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cloudinary = require('cloudinary').v2;
const { MongoClient, ObjectId } = require('mongodb');
const piyasaVeritabani = require('./database.js');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client("104508083781-2ib50lt8k0ud027375q9k3aja7gd8403.apps.googleusercontent.com");

// YENİ: E-posta Gönderici Motoru
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const app = express();
app.use(cors({ origin: '*' }));

// Gelen JSON verilerini okumak için gerekli ayar:
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// YENİ: Tek resim yerine dizi (array) halinde en fazla 3 resim kabul eder.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // Tek bir dosya için 10MB limit
});

// DOĞRU OLAN (Render'daki Environment Variable'ı okur):
const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
let db, statsCollection, feedCollection;

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
const delay = (ms) => new Promise(res => setTimeout(res, ms));

let globalScans = 0;
let globalFrauds = 0;
let recentFeed = [];

async function connectDB() {
    try {
        await client.connect();
        db = client.db("PiyasaAI");
        statsCollection = db.collection("stats");
        feedCollection = db.collection("feed");
        console.log("✅ MongoDB (Fil Hafızası) Bağlantısı BAŞARILI!");

        const stats = await statsCollection.findOne({ id: "global" });
        if (!stats) {
            await statsCollection.insertOne({ id: "global", globalScans: 0, globalFrauds: 0 });
        } else {
            globalScans = stats.globalScans;
            globalFrauds = stats.globalFrauds;
        }

        recentFeed = await feedCollection.find().sort({ time: -1 }).limit(10).toArray();
    } catch (err) {
        console.error("❌ MongoDB Bağlantı Hatası:", err);
    }
}
connectDB();

// YENİ: Yapay Zeka Suistimal Koruması (Rate Limiter)
const analyzeLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 dakika (60.000 milisaniye)
    max: 3, // Aynı IP adresinden 1 dakikada en fazla 3 analiz izni
    message: { error: "Çok fazla analiz isteği gönderdiniz. Güvenlik gereği lütfen 1 dakika bekleyip tekrar deneyin." },
    standardHeaders: true, // Rate limit bilgisini `RateLimit-*` başlıklarında gönderir
    legacyHeaders: false, // Eski `X-RateLimit-*` başlıklarını devre dışı bırakır
});

app.get('/stats', (req, res) => {
    res.json({
        totalScans: globalScans,
        fraudCount: globalFrauds,
        recentFeed: recentFeed
    });
});

// YENİ: Frontend'in güncel fiyat listesini çekeceği ana API rotası
app.get('/api/database', (req, res) => {
    res.json(piyasaVeritabani);
});

// Google Kullanıcı Girişini Karşılayan ve MongoDB'ye Kaydeden Bölüm
app.post('/auth/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: "104508083781-2ib50lt8k0ud027375q9k3aja7gd8403.apps.googleusercontent.com",
        });
        const payload = ticket.getPayload();

        // MongoDB'de "users" (Kullanıcılar) koleksiyonuna bağlanıyoruz
        if (db) {
            const usersCollection = db.collection("users");
            await usersCollection.updateOne(
                { email: payload.email },
                {
                    $set: {
                        name: payload.name,
                        picture: payload.picture,
                        lastLogin: Date.now()
                    }
                },
                { upsert: true } // Kayıt varsa güncelle, yoksa yeni kayıt oluştur
            );
            res.json({ success: true, message: "Kullanıcı MongoDB'ye (Fil Hafızasına) başarıyla kaydedildi!" });
        } else {
            res.status(500).json({ success: false, error: "Veritabanı bağlantısı henüz hazır değil." });
        }
    } catch (error) {
        console.error("Google Doğrulama Hatası:", error);
        res.status(400).json({ success: false, error: "Google kimliği doğrulanamadı!" });
    }
});

// Yeni Alarm Kaydetme Çekmecesi (Route)
app.post('/add-alarm', async (req, res) => {
    // Paketin içinden adamın mailini, modeli ve fiyatı çıkarıyoruz
    const { email, model, targetPrice } = req.body;

    if (!db) return res.status(500).json({ success: false, error: "Veritabanı bağlantısı kurulamadı." });
    if (!email || !model || !targetPrice) return res.status(400).json({ success: false, error: "Eksik bilgi gönderdin!" });

    try {
        const alarmsCollection = db.collection("alarms"); // "alarms" diye yepyeni bir çekmece açıyoruz

        // MongoDB'ye "Bu adamın bu model için alarmı varsa güncelle, yoksa yeni oluştur" diyoruz (Buna yazılımda Upsert denir)
        await alarmsCollection.updateOne(
            { email: email, model: model },
            { $set: { targetPrice: targetPrice, createdAt: Date.now() } },
            { upsert: true }
        );

        res.json({ success: true, message: "Alarm kusursuz bir şekilde kaydedildi!" });
    } catch (error) {
        console.error("Alarm kayıt hatası:", error);
        res.status(500).json({ success: false, error: "Alarm MongoDB'ye kaydedilemedi." });
    }
});

app.get('/my-alarms', async (req, res) => {
    const email = req.query.email;
    if (!db) return res.status(500).json({ success: false, error: "Veritabanı bağlantısı kurulamadı." });
    if (!email) return res.status(400).json({ success: false, error: "E-posta adresi belirtilmedi." });

    try {
        const alarmsCollection = db.collection("alarms");
        const userAlarmlari = await alarmsCollection.find({ email: email }).toArray();
        res.json({ success: true, alarmlar: userAlarmlari });
    } catch (error) {
        res.status(500).json({ success: false, error: "Alarmlar getirilemedi." });
    }
});

app.delete('/delete-alarm', async (req, res) => {
    const { email, model } = req.body;
    if (!db) return res.status(500).json({ success: false, error: "Veritabanı bağlantısı yok." });

    try {
        const alarmsCollection = db.collection("alarms");
        await alarmsCollection.deleteOne({ email: email, model: model });
        res.json({ success: true, message: "Alarm silindi." });
    } catch (error) {
        res.status(500).json({ success: false, error: "Silme işlemi başarısız." });
    }
});

app.post('/report-fraud', async (req, res) => {
    try {
        globalFrauds++; 
        if (statsCollection) {
            await statsCollection.updateOne(
                { id: "global" },
                { $set: { globalFrauds: globalFrauds } },
                { upsert: true }
            );
        }
        res.json({ success: true, newFraudCount: globalFrauds });
    } catch (error) {
        res.status(500).json({ success: false, error: "Sayaç güncellenemedi." });
    }
});

app.post('/analyze', analyzeLimiter, upload.array('images', 3), async (req, res) => {
    console.log("\n--- GÖRSEL ANALİZ BAŞLADI ---");

    let imageParts = [];
    let finalImageUrl = "";

    try {
        console.log("1. Görsel(ler) hazırlanıyor...");

        if (req.files && req.files.length > 0) {
            // Sadece ilk fotoğrafı canlı akış (Live Feed) için Cloudinary'e yükle
            if (process.env.CLOUD_NAME) {
                try {
                    const uploadResult = await new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream({ folder: "piyasa_ai" }, (error, result) => {
                            if (error) reject(error); else resolve(result);
                        });
                        stream.end(req.files[0].buffer);
                    });
                    finalImageUrl = uploadResult.secure_url;
                } catch (e) { console.log("Bulut yükleme hatası:", e.message); }
            }

            // Gemini AI için tüm fotoğrafları Base64'e çevir ve hazırla
            for (let file of req.files) {
                imageParts.push({
                    inlineData: {
                        data: file.buffer.toString("base64"),
                        mimeType: file.mimetype
                    }
                });
            }
        }
        else if (req.body.imageUrl) {
            console.log("URL'den resim indiriliyor...");
            const fetchRes = await fetch(req.body.imageUrl);
            if (!fetchRes.ok) throw new Error("Linkteki resme ulaşılamadı.");

            const arrayBuffer = await fetchRes.arrayBuffer();
            imageParts.push({
                inlineData: {
                    data: Buffer.from(arrayBuffer).toString('base64'),
                    mimeType: fetchRes.headers.get('content-type') || 'image/jpeg'
                }
            });
            finalImageUrl = req.body.imageUrl;
        } else {
            return res.json({ error: 'Resim veya resim linki bulunamadı!' });
        }

        const bugun = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        const dbMetni = JSON.stringify(piyasaVeritabani, null, 2);

        // YENİ PROMPT: Yapay Zekaya özel ayar çekildi ve kurallar katılaştırıldı
        const prompt = `Sen Türkiye'nin en iyi ve en kurt ikinci el telefon piyasası uzmanısın. Bugünün tarihi: ${bugun}. 
        Sana bir ilana ait 1'den fazla ekran görüntüsü göndermiş olabilirim. Lütfen gönderdiğim TÜM fotoğrafları inceleyerek, oradaki bilgileri (fiyat, açıklama, kapasite, garanti durumu vb.) birleştirip tam bir analiz yap.

        İLK VE EN ÖNEMLİ KURAL (GÜVENLİK DUVARI): Yüklenen görseller SATILIK BİR TELEFON VEYA CİHAZ İLANI DEĞİLSE veya görselde NET BİR SATIŞ FİYATI YAZMIYORSA (örneğin kedi, manzara, YouTube kutu açılışı, rastgele insan), analizi DERHAL DURDUR ve SADECE ŞU JSON'u döndür:
        {"isListing": false, "error": "Geçersiz görsel. Lütfen geçerli bir cihaz ilanı yükleyin."}

        EĞER GÖRSEL GERÇEKTEN BİR İLAN İSE, analiz yap ve AŞAĞIDAKİ KURALLARA GÖRE DEVAM ET.
        
        KULLANMAN GEREKEN GÜNCEL PİYASA REFERANS FİYATLARI (VERİTABANI):
        ${dbMetni}
        
        GÖREVİN (ÇOK KRİTİK VE DİKKATLİ OL):
        1. Model Tespiti: İlanın modelini KESİNLİKLE yukarıdaki veritabanında yazan isimle birebir aynı olacak şekilde yaz (Örn: 'Apple iPhone 17 Pro Max' değil, sadece 'iPhone 17 Pro Max' yaz).
        2. İlandaki ana fiyatı gör. DİKKAT: '23.00' veya '19:00' gibi saat ibarelerini fiyat sanma.
        
        3. Cihazın Durumu (ÇOK ÖNEMLİ KURAL): 
           - İlanın açıklamasında veya başlığında "yd", "yurtdışı", "yurt dışı", "kayıtsız", "server kayıtlı", "çift hatlı", "pasaport kayıtlı" gibi kelimeler geçiyorsa, ilandaki teknik özellikler tablosunda 'Alındığı Yer: Yurt İçi' yazsa BİLE BU CİHAZ KESİNLİKLE YURT DIŞIDIR! Başlık ve açıklama, tablodan her zaman üstündür.
           - Bu kurala göre JSON içindeki 'condition' değerine SADECE VE KESİNLİKLE şu 4 koddan birini yazmalısın:
             * "TR_Sifir" (Türkiye garantili, kapalı kutu)
             * "TR_IkinciEl" (Türkiye garantili/garantisi bitmiş ikinci el)
             * "YurtDisi_Sifir" (Yurt dışı, kapalı kutu/sıfır vb.)
             * "YurtDisi_IkinciEl" (Yurt dışı ikinci el)
             
        4. FİYAT ANALİZİ: İlandaki istenen fiyatı, seçtiğin "condition" kategorisindeki piyasa fiyatıyla karşılaştır. 
        
        !!! ÇOK ÖNEMLİ OLTALAMA (SCAM) KURALI !!!
        Eğer istenen fiyat, veritabanındaki fiyattan YÜKSEKSE veya piyasasına göre normalden biraz daha PAHALIYSA, bu genellikle oltalama DEĞİLDİR. Satıcı tok satıcıdır, buna yüksek risk puanı VERME. 
        Oltalama (Scam) asıl fiyat piyasanın İNANILMAZ ALTINDA olduğunda olur. Bu ayrımı mükemmel yapmalısın!
        
        PUANLAMA:
        - 0-20 arası: DÜŞÜK RİSK (Fiyat normal veya biraz pahalı).
        - 20-50 arası: ORTA RİSK.
        - 50-100 arası: YÜKSEK RİSK (Fiyat şüpheli şekilde çok çok altında).

        SADECE JSON FORMATINDA CEVAP VER, EK AÇIKLAMA YAZMA. GÖRSEL GEÇERLİ BİR İLAN İSE FORMAT ŞU ŞEKİLDE OLMALIDIR:
        {"isListing": true, "score": 10, "reason": "Fiyat yurtdışı sıfır piyasasına uygun.", "model": "iPhone 17 Pro Max", "fiyat": "74.999 TL", "condition": "YurtDisi_Sifir"}
        `;

        let MAX_RETRIES = 3;
        let success = false;
        let responseText = "";

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const result = await model.generateContent([prompt, ...imageParts]);
                responseText = result.response.text();
                success = true;
                break;
            } catch (apiError) {
                if (apiError.message.includes('503') || apiError.message.toLowerCase().includes('demand')) {
                    if (i < MAX_RETRIES - 1) await delay(3000);
                    else throw new Error("Google yapay zeka sunucularında anlık bir yoğunluk var. Lütfen 15-20 saniye bekleyip tekrar deneyin.");
                } else if (apiError.message.includes('429')) {
                    throw new Error("Günlük veya dakikalık ücretsiz analiz limitine ulaşıldı. Lütfen bir süre sonra tekrar deneyin.");
                } else throw new Error("Analiz sırasında bir sorun oluştu: " + apiError.message);
            }
        }

        if (!success) throw new Error("Analiz tamamlanamadı.");

        // 1. JSON Çıkarma ve Çözümleme (Kayıp kod eklendi)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.json({ error: "Yapay zeka görseli tanımlayamadı. Lütfen net bir ilan fotoğrafı yükleyin." });
        }
        const aiAnalysis = JSON.parse(jsonMatch[0]);

        // 2. KÖKÜNDEN ENGELLEME (AŞILAMAZ JAVASCRIPT DUVARI)
        const algilananModel = (aiAnalysis.model || "").toLowerCase();
        const fiyatMetni = String(aiAnalysis.fiyat || "").toLowerCase(); // Sayı bile gelse metne çevirir
        
        const uydurmaModeller = ["belirsiz", "bilinmiyor", "tespit", "bilgi yok", "bilinmeyen", "yok", "bulunamadı", "diğer"];
        const trollMu = uydurmaModeller.some(kelime => algilananModel.includes(kelime));
        
        // MURATABİGF ENGELİ: Eğer görselden bir "Fiyat (Rakam + TL/Lira)" çıkmıyorsa, KESİNLİKLE İLAN DEĞİLDİR!
        const gercekFiyatMi = /\d/.test(fiyatMetni) && (fiyatMetni.includes('tl') || fiyatMetni.includes('lira') || fiyatMetni.includes('₺'));

        if (aiAnalysis.isListing === false || trollMu || !gercekFiyatMi) {
            return res.json({ error: "Geçersiz görsel. Sistem bu görselde net bir fiyat veya teknolojik cihaz ilanı tespit edemedi." });
        }

        // Eğer buraya kadar gelebildiyse görselde Fiyat ve Model vardır (GERÇEK BİR İLANDIR)
        globalScans++;
        if (aiAnalysis.score >= 75) globalFrauds++;

        if (statsCollection) {
            await statsCollection.updateOne(
                { id: "global" },
                { $set: { globalScans: globalScans, globalFrauds: globalFrauds } },
                { upsert: true }
            );
        }

        if (!aiAnalysis.condition || aiAnalysis.condition === "Bilinmiyor") {
            return res.json({ success: true, riskScore: aiAnalysis.score, reason: "Cihaz durumu tespit edilemediği için radara eklenmedi." });
        }

        const newFeedItem = {
            model: aiAnalysis.model || "Bilinmeyen Cihaz",
            condition: aiAnalysis.condition || "TR_IkinciEl",
            riskScore: aiAnalysis.score,
            fiyat: aiAnalysis.fiyat || "Belirtilmemiş",
            reason: aiAnalysis.reason || "Belirtilmedi", // Rapor detayını da DB'ye ekledik
            imageUrl: finalImageUrl,
            time: Date.now()
        };

        let insertedId = null;
        if (feedCollection) {
            const result = await feedCollection.insertOne(newFeedItem);
            insertedId = result.insertedId; // MongoDB'nin atadığı eşsiz ID'yi yakaladık
            recentFeed = await feedCollection.find().sort({ time: -1 }).limit(10).toArray();
        } else {
            recentFeed.unshift(newFeedItem);
            if (recentFeed.length > 10) recentFeed.pop();
        }

        res.json({
            success: true,
            analysisId: insertedId, // Frontend'e paylaşım için ID'yi gönderiyoruz
            riskScore: aiAnalysis.score,
            reason: aiAnalysis.reason,
            model: aiAnalysis.model || "Bilinmeyen Cihaz",
            fiyat: aiAnalysis.fiyat || "Belirtilmemiş",
            totalScans: globalScans,
            fraudCount: globalFrauds
        });

    } catch (err) {
        console.error("KRİTİK HATA:", err.message);
        res.json({ error: err.message });
    }
});

// Paylaşılan Analiz URL'sini Karşılayan Rota
app.get('/analysis/:id', async (req, res) => {
    if (!feedCollection) return res.status(500).json({ error: "Veritabanı hazır değil." });
    try {
        const item = await feedCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!item) return res.status(404).json({ error: "Analiz bulunamadı veya silinmiş." });
        res.json({ success: true, data: item });
    } catch (err) {
        res.status(400).json({ error: "Geçersiz analiz kimliği." });
    }
});

// GİZLİ TEMİZLİK ROTASI (Siteyi temizlemek için tarayıcıdan bu linke gireceksin)
app.get('/temizlik-yap', async (req, res) => {
    try {
        if (!feedCollection || !statsCollection) return res.send("DB Bağlanamadı.");

        // 1. Troll ilanları veritabanından KESİN OLARAK sil (Büyük/Küçük harf duyarlılığını kaldırdık)
        await feedCollection.deleteMany({
            model: { $regex: /bilinmiyor|tespit|belirlenemedi|bilgi yok|bilinmeyen|belirsiz/i }
        });

        // 2. Dolandırıcı sayacını 5'e eşitle
        globalFrauds = 5;
        await statsCollection.updateOne(
            { id: "global" },
            { $set: { globalFrauds: 5 } },
            { upsert: true }
        );

        // 3. Son 10 listesini güncelle
        recentFeed = await feedCollection.find().sort({ time: -1 }).limit(10).toArray();

        res.send("<h1 style='color:green;'>Temizlik Başarılı!</h1><p>Troll ilanlar silindi, Dolandırıcı sayısı 2 yapıldı. Kendi siteni yenileyebilirsin.</p>");
    } catch(e) {
        res.send("Hata: " + e.message);
    }
});

const PORT = process.env.PORT || 3000;

// ==========================================
// OTONOM FİYAT ALARMI MOTORU (CRON JOB)
// Her gün sabah 10:00'da çalışır ('0 10 * * *')
// ==========================================
cron.schedule('* * * * *', async () => {
    console.log("⏰ [CRON] Fiyat alarmı kontrolü başlatıldı...");
    if (!db) return;

    try {
        const alarms = await db.collection("alarms").find().toArray();
        if (alarms.length === 0) return console.log("Aktif alarm bulunamadı.");

        for (let alarm of alarms) {
            const cihazData = piyasaVeritabani[alarm.model];
            // Cihaz veritabanında yoksa veya TR_IkinciEl fiyatı girilmemişse atla
            if (!cihazData || !cihazData["TR_IkinciEl"]) continue;

            // Yeni - Hata Toleranslı Blok (Tüm sayı formatlarını destekler)
            let stringFiyat = String(cihazData["TR_IkinciEl"]);
            let piyasaSayilari = stringFiyat.split('-').map(val => parseInt(val.replace(/[^0-9]/g, '')) || 0);
            let guncelFiyat = 0;

            if (piyasaSayilari.length === 2 && piyasaSayilari[0] > 0 && piyasaSayilari[1] > 0) {
                guncelFiyat = (piyasaSayilari[0] + piyasaSayilari[1]) / 2;
            } else if (piyasaSayilari.length > 0 && piyasaSayilari[0] > 0) {
                guncelFiyat = piyasaSayilari[0];
            }

            // MANTIK: Eğer güncel piyasa fiyatı, adamın hedeflediği fiyata eşit veya altındaysa VUR!
            if (guncelFiyat > 0 && guncelFiyat <= alarm.targetPrice) {
                const mailOptions = {
                    from: '"Piyasa.ai Radar" <' + process.env.EMAIL_USER + '>',
                    to: alarm.email,
                    subject: '🚀 Hedef Vuruldu: ' + alarm.model + ' Fiyatı Düştü!',
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 30px; background-color: #000000; color: #ffffff; border-radius: 12px; border: 1px solid #333333; max-width: 500px; margin: 0 auto; text-align: center;">
                            <h2 style="color: #30D158; margin-bottom: 10px;">Fiyat Radara Takıldı!</h2>
                            <p style="color: #8E8E93; font-size: 14px; margin-bottom: 25px;">Takip ettiğin cihaz istediğin seviyeye geriledi.</p>
                            
                            <div style="background: #121212; border: 1px solid #333; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                                <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">${alarm.model}</div>
                                <div style="color: #8E8E93; font-size: 12px;">Güncel Piyasa Ortalaması</div>
                                <div style="font-size: 24px; font-weight: bold; color: #ffffff;">${guncelFiyat.toLocaleString('tr-TR')} TL</div>
                                <div style="color: #8E8E93; font-size: 12px; margin-top: 10px;">Senin Hedefin: ${alarm.targetPrice.toLocaleString('tr-TR')} TL</div>
                            </div>
                            
                            <a href="https://piyasai.com.tr" style="background-color: #ffffff; color: #000000; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Hemen İlanlara Bak</a>
                        </div>
                    `
                };

                // Maili Gönder
                await transporter.sendMail(mailOptions);
                console.log(`📧 E-posta başarıyla gönderildi: ${alarm.email} -> ${alarm.model}`);

                // Adamı her gün spamllememek için hedefine ulaşan alarmı veritabanından siliyoruz
                await db.collection("alarms").deleteOne({ _id: alarm._id });
            }
        }
    } catch (err) {
        console.error("❌ Cron Job Hatası:", err);
    }
});

app.listen(PORT, () => {
    console.log("Piyasa.ai SISTEM AKTIF! 🚀");
});