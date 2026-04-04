const express = require('express');
const cron = require('node-cron');
const cors = require('cors');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;
const { MongoClient, ObjectId } = require('mongodb');
const { OAuth2Client } = require('google-auth-library');
const piyasaVeritabani = require('./database.js');

const googleClient = new OAuth2Client(
    '104508083781-2ib50lt8k0ud027375q9k3aja7gd8403.apps.googleusercontent.com'
);

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
let db;
let statsCollection;
let feedCollection;

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let globalScans = 0;
let globalFrauds = 0;
let recentFeed = [];
let isAlarmJobRunning = false;

function parsePriceValue(priceText) {
    const values = String(priceText || '')
        .split('-')
        .map((value) => parseInt(value.replace(/[^0-9]/g, ''), 10) || 0)
        .filter((value) => value > 0);

    if (values.length >= 2) {
        return (values[0] + values[1]) / 2;
    }

    return values[0] || 0;
}

function buildAlarmEmailHtml(alarm, currentPrice) {
    return `
        <div style="font-family: Arial; padding: 30px; background: #000; color: #fff; border: 1px solid #333; max-width: 500px; border-radius: 12px;">
            <h2 style="color: #30D158;">Piyasa.ai fiyat uyarisi</h2>
            <p>${alarm.model} icin belirledigine yakin bir fiyat bulundu.</p>
            <div style="background: #111; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>Guncel Piyasa:</strong> ${currentPrice.toLocaleString('tr-TR')} TL<br>
                <strong>Senin Hedefin:</strong> ${Number(alarm.targetPrice).toLocaleString('tr-TR')} TL
            </div>
            <a href="https://piyasai.com.tr" style="background: #fff; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ilanlara Git</a>
        </div>`;
}

function buildAlarmEmailText(alarm, currentPrice) {
    return [
        'Piyasa.ai fiyat uyarisi',
        `${alarm.model} icin belirledigine yakin bir fiyat bulundu.`,
        `Guncel piyasa: ${currentPrice.toLocaleString('tr-TR')} TL`,
        `Senin hedefin: ${Number(alarm.targetPrice).toLocaleString('tr-TR')} TL`,
        'Ilanlara git: https://piyasai.com.tr'
    ].join('\n');
}

async function sendBrevoEmail({ to, subject, htmlContent, textContent }) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || 'Piyasa.ai';

    if (!apiKey) {
        throw new Error('BREVO_API_KEY tanimli degil.');
    }

    if (!senderEmail) {
        throw new Error('Brevo gonderici e-posta adresi tanimli degil.');
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: [{ email: to }],
            subject,
            htmlContent,
            textContent
        })
    });

    if (response.ok) {
        return;
    }

    const responseText = await response.text();
    throw new Error(`Brevo mail hatasi (${response.status}): ${responseText}`);
}

async function checkPriceAlarms() {
    if (isAlarmJobRunning) {
        console.log('[CRON] Fiyat alarmi kontrolu zaten calisiyor, yeni tur atlandi.');
        return;
    }

    if (!db) {
        console.log('[CRON] DB baglantisi yok, islem iptal.');
        return;
    }

    isAlarmJobRunning = true;

    try {
        const alarms = await db.collection('alarms').find().toArray();
        const seenAlarmKeys = new Set();

        if (alarms.length === 0) {
            console.log('[CRON] Aktif alarm bulunamadi.');
            return;
        }

        for (const alarm of alarms) {
            const cihazData = piyasaVeritabani[alarm.model];
            const currentPrice = parsePriceValue(cihazData?.TR_IkinciEl);

            if (!currentPrice) {
                continue;
            }

            console.log(
                `[CRON] Kontrol: ${alarm.model} | Piyasa: ${currentPrice} TL | Hedef: ${alarm.targetPrice} TL`
            );

            if (currentPrice > Number(alarm.targetPrice)) {
                continue;
            }

            const alarmKey = `${alarm.email}|${alarm.model}|${Number(alarm.targetPrice)}`;
            if (seenAlarmKeys.has(alarmKey)) {
                continue;
            }
            seenAlarmKeys.add(alarmKey);

            try {
                await sendBrevoEmail({
                    to: alarm.email,
                    subject: `Piyasa.ai fiyat uyarisi: ${alarm.model}`,
                    htmlContent: buildAlarmEmailHtml(alarm, currentPrice),
                    textContent: buildAlarmEmailText(alarm, currentPrice)
                });

                console.log(`[CRON] Mail basariyla gonderildi: ${alarm.email}`);
                await db.collection('alarms').deleteOne({ _id: alarm._id });
            } catch (error) {
                console.error(`[CRON] Mail gonderim hatasi (${alarm.email}):`, error.message);
            }
        }
    } catch (error) {
        console.error('[CRON] Genel hata:', error);
    } finally {
        isAlarmJobRunning = false;
    }
}

async function connectDB() {
    try {
        await client.connect();
        db = client.db('PiyasaAI');
        statsCollection = db.collection('stats');
        feedCollection = db.collection('feed');
        console.log('MongoDB baglantisi basarili.');

        const stats = await statsCollection.findOne({ id: 'global' });
        if (!stats) {
            await statsCollection.insertOne({ id: 'global', globalScans: 0, globalFrauds: 0 });
        } else {
            globalScans = stats.globalScans;
            globalFrauds = stats.globalFrauds;
        }

        recentFeed = await feedCollection.find().sort({ time: -1 }).limit(10).toArray();
    } catch (err) {
        console.error('MongoDB baglanti hatasi:', err);
    }
}

connectDB();

const analyzeLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 3,
    message: { error: 'Cok fazla analiz istegi gonderdiniz. Lutfen 1 dakika sonra tekrar deneyin.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.get('/stats', (req, res) => {
    res.json({
        totalScans: globalScans,
        fraudCount: globalFrauds,
        recentFeed
    });
});

app.get('/api/database', (req, res) => {
    res.json(piyasaVeritabani);
});

app.post('/auth/google', async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: '104508083781-2ib50lt8k0ud027375q9k3aja7gd8403.apps.googleusercontent.com'
        });
        const payload = ticket.getPayload();

        if (!db) {
            return res.status(500).json({ success: false, error: 'Veritabani baglantisi henuz hazir degil.' });
        }

        const usersCollection = db.collection('users');
        await usersCollection.updateOne(
            { email: payload.email },
            {
                $set: {
                    name: payload.name,
                    picture: payload.picture,
                    lastLogin: Date.now()
                }
            },
            { upsert: true }
        );

        res.json({ success: true, message: "Kullanici MongoDB'ye basariyla kaydedildi." });
    } catch (error) {
        console.error('Google dogrulama hatasi:', error);
        res.status(400).json({ success: false, error: 'Google kimligi dogrulanamadi.' });
    }
});

app.post('/add-alarm', async (req, res) => {
    const { email, model, targetPrice } = req.body;

    if (!db) {
        return res.status(500).json({ success: false, error: 'Veritabani baglantisi kurulamadı.' });
    }

    if (!email || !model || !targetPrice) {
        return res.status(400).json({ success: false, error: 'Eksik bilgi gonderdin.' });
    }

    try {
        const alarmsCollection = db.collection('alarms');
        await alarmsCollection.updateOne(
            { email, model },
            { $set: { targetPrice: Number(targetPrice), createdAt: Date.now() } },
            { upsert: true }
        );

        res.json({ success: true, message: 'Alarm basariyla kaydedildi.' });
    } catch (error) {
        console.error('Alarm kayit hatasi:', error);
        res.status(500).json({ success: false, error: "Alarm MongoDB'ye kaydedilemedi." });
    }
});

app.get('/my-alarms', async (req, res) => {
    const email = req.query.email;

    if (!db) {
        return res.status(500).json({ success: false, error: 'Veritabani baglantisi kurulamadı.' });
    }

    if (!email) {
        return res.status(400).json({ success: false, error: 'E-posta adresi belirtilmedi.' });
    }

    try {
        const alarmsCollection = db.collection('alarms');
        const userAlarmlari = await alarmsCollection.find({ email }).toArray();
        res.json({ success: true, alarmlar: userAlarmlari });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Alarmlar getirilemedi.' });
    }
});

app.delete('/delete-alarm', async (req, res) => {
    const { email, model } = req.body;

    if (!db) {
        return res.status(500).json({ success: false, error: 'Veritabani baglantisi yok.' });
    }

    try {
        const alarmsCollection = db.collection('alarms');
        await alarmsCollection.deleteOne({ email, model });
        res.json({ success: true, message: 'Alarm silindi.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Silme islemi basarisiz.' });
    }
});

app.post('/report-fraud', async (req, res) => {
    try {
        globalFrauds += 1;

        if (statsCollection) {
            await statsCollection.updateOne(
                { id: 'global' },
                { $set: { globalFrauds } },
                { upsert: true }
            );
        }

        res.json({ success: true, newFraudCount: globalFrauds });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Sayac guncellenemedi.' });
    }
});

app.post('/analyze', analyzeLimiter, upload.array('images', 3), async (req, res) => {
    console.log('\n--- GORSEL ANALIZ BASLADI ---');

    let imageParts = [];
    let finalImageUrl = '';

    try {
        console.log('1. Gorseller hazirlaniyor...');

        if (req.files && req.files.length > 0) {
            if (process.env.CLOUD_NAME) {
                try {
                    const uploadResult = await new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream({ folder: 'piyasa_ai' }, (error, result) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        });

                        stream.end(req.files[0].buffer);
                    });

                    finalImageUrl = uploadResult.secure_url;
                } catch (error) {
                    console.log('Bulut yukleme hatasi:', error.message);
                }
            }

            for (const file of req.files) {
                imageParts.push({
                    inlineData: {
                        data: file.buffer.toString('base64'),
                        mimeType: file.mimetype
                    }
                });
            }
        } else if (req.body.imageUrl) {
            console.log("URL'den resim indiriliyor...");
            const fetchRes = await fetch(req.body.imageUrl);

            if (!fetchRes.ok) {
                throw new Error('Linkteki resme ulasilamadi.');
            }

            const arrayBuffer = await fetchRes.arrayBuffer();
            imageParts.push({
                inlineData: {
                    data: Buffer.from(arrayBuffer).toString('base64'),
                    mimeType: fetchRes.headers.get('content-type') || 'image/jpeg'
                }
            });
            finalImageUrl = req.body.imageUrl;
        } else {
            return res.json({ error: 'Resim veya resim linki bulunamadi.' });
        }

        const bugun = new Date().toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const dbMetni = JSON.stringify(piyasaVeritabani, null, 2);

        const prompt = `Sen Turkiye'nin en iyi ikinci el telefon piyasasi uzmansin. Bugunun tarihi: ${bugun}.
Sana bir ilana ait birden fazla ekran goruntusu gondermis olabilirim. Gonderdigim tum fotograflari inceleyerek fiyat, aciklama, kapasite ve garanti durumunu birlestirip analiz et.

ILK VE EN ONEMLI KURAL: Yuklenen gorseller satilik bir telefon veya cihaz ilani degilse ya da gorselde net bir satis fiyati yazmiyorsa analizi durdur ve sadece su JSON'u don:
{"isListing": false, "error": "Gecersiz gorsel. Lutfen gecerli bir cihaz ilani yukleyin."}

EGER GORSEL GERCEKTEN BIR ILAN ISE, asagidaki kurallara gore devam et.

KULLANMAN GEREKEN GUNCEL PIYASA REFERANS FIYATLARI:
${dbMetni}

GOREVIN:
1. Model tespiti: Ilanin modelini veritabanindaki isimle birebir ayni yaz.
2. Ilandaki ana fiyati gor. "23.00" veya "19:00" gibi saat ibarelerini fiyat sanma.
3. Cihazin durumu:
   - Aciklama veya baslikta "yd", "yurtdisi", "yurt disi", "kayitsiz", "server kayitli", "cift hatli", "pasaport kayitli" gibi kelimeler geciyorsa teknik tabloda "Alindigi Yer: Yurt Ici" yazsa bile cihaz yurt disidir.
   - JSON icindeki "condition" degerine sadece su kodlardan birini yaz:
     * "TR_Sifir"
     * "TR_IkinciEl"
     * "YurtDisi_Sifir"
     * "YurtDisi_IkinciEl"
4. Fiyat analizi: Ilan fiyatini sectigin "condition" kategorisindeki piyasa fiyatiyla karsilastir.

SCAM KURALI:
Istenen fiyat veritabanindaki fiyattan yuksekse veya biraz pahaliysa bu genellikle scam degildir.
Scam, asil olarak fiyat piyasanin inanilmaz altinda oldugunda olur.

PUANLAMA:
- 0-20: DUSUK RISK
- 20-50: ORTA RISK
- 50-100: YUKSEK RISK

SADECE JSON FORMATINDA CEVAP VER. EK ACIKLAMA YAZMA.
{"isListing": true, "score": 10, "reason": "Fiyat yurtdisi sifir piyasasina uygun.", "model": "iPhone 17 Pro Max", "fiyat": "74.999 TL", "condition": "YurtDisi_Sifir"}`;

        const MAX_RETRIES = 3;
        let success = false;
        let responseText = '';

        for (let i = 0; i < MAX_RETRIES; i += 1) {
            try {
                const result = await model.generateContent([prompt, ...imageParts]);
                responseText = result.response.text();
                success = true;
                break;
            } catch (apiError) {
                if (apiError.message.includes('503') || apiError.message.toLowerCase().includes('demand')) {
                    if (i < MAX_RETRIES - 1) {
                        await delay(3000);
                    } else {
                        throw new Error(
                            'Google yapay zeka sunucularinda anlik bir yogunluk var. Lutfen 15-20 saniye bekleyip tekrar deneyin.'
                        );
                    }
                } else if (apiError.message.includes('429')) {
                    throw new Error(
                        'Gunluk veya dakikalik ucretsiz analiz limitine ulasildi. Lutfen bir sure sonra tekrar deneyin.'
                    );
                } else {
                    throw new Error(`Analiz sirasinda bir sorun olustu: ${apiError.message}`);
                }
            }
        }

        if (!success) {
            throw new Error('Analiz tamamlanamadi.');
        }

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.json({ error: 'Yapay zeka gorseli tanimlayamadi. Lutfen net bir ilan fotografi yukleyin.' });
        }

        const aiAnalysis = JSON.parse(jsonMatch[0]);
        const algilananModel = String(aiAnalysis.model || '').toLowerCase();
        const fiyatMetni = String(aiAnalysis.fiyat || '').toLowerCase();
        const uydurmaModeller = ['belirsiz', 'bilinmiyor', 'tespit', 'bilgi yok', 'bilinmeyen', 'yok', 'bulunamadi', 'diger'];
        const trollMu = uydurmaModeller.some((kelime) => algilananModel.includes(kelime));
        const gercekFiyatMi =
            /\d/.test(fiyatMetni) &&
            (fiyatMetni.includes('tl') || fiyatMetni.includes('lira') || fiyatMetni.includes('₺'));

        if (aiAnalysis.isListing === false || trollMu || !gercekFiyatMi) {
            return res.json({
                error: 'Gecersiz gorsel. Sistem bu gorselde net bir fiyat veya teknolojik cihaz ilani tespit edemedi.'
            });
        }

        globalScans += 1;
        if (aiAnalysis.score >= 75) {
            globalFrauds += 1;
        }

        if (statsCollection) {
            await statsCollection.updateOne(
                { id: 'global' },
                { $set: { globalScans, globalFrauds } },
                { upsert: true }
            );
        }

        if (!aiAnalysis.condition || aiAnalysis.condition === 'Bilinmiyor') {
            return res.json({
                success: true,
                riskScore: aiAnalysis.score,
                reason: 'Cihaz durumu tespit edilemedigi icin radara eklenmedi.'
            });
        }

        const newFeedItem = {
            model: aiAnalysis.model || 'Bilinmeyen Cihaz',
            condition: aiAnalysis.condition || 'TR_IkinciEl',
            riskScore: aiAnalysis.score,
            fiyat: aiAnalysis.fiyat || 'Belirtilmemis',
            reason: aiAnalysis.reason || 'Belirtilmedi',
            imageUrl: finalImageUrl,
            time: Date.now()
        };

        let insertedId = null;
        if (feedCollection) {
            const result = await feedCollection.insertOne(newFeedItem);
            insertedId = result.insertedId;
            recentFeed = await feedCollection.find().sort({ time: -1 }).limit(10).toArray();
        } else {
            recentFeed.unshift(newFeedItem);
            if (recentFeed.length > 10) {
                recentFeed.pop();
            }
        }

        res.json({
            success: true,
            analysisId: insertedId,
            riskScore: aiAnalysis.score,
            reason: aiAnalysis.reason,
            model: aiAnalysis.model || 'Bilinmeyen Cihaz',
            fiyat: aiAnalysis.fiyat || 'Belirtilmemis',
            totalScans: globalScans,
            fraudCount: globalFrauds
        });
    } catch (err) {
        console.error('KRITIK HATA:', err.message);
        res.json({ error: err.message });
    }
});

app.get('/analysis/:id', async (req, res) => {
    if (!feedCollection) {
        return res.status(500).json({ error: 'Veritabani hazir degil.' });
    }

    try {
        const item = await feedCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!item) {
            return res.status(404).json({ error: 'Analiz bulunamadi veya silinmis.' });
        }

        res.json({ success: true, data: item });
    } catch (err) {
        res.status(400).json({ error: 'Gecersiz analiz kimligi.' });
    }
});

app.get('/temizlik-yap', async (req, res) => {
    try {
        if (!feedCollection || !statsCollection) {
            return res.send('DB baglanamadi.');
        }

        await feedCollection.deleteMany({
            model: { $regex: /bilinmiyor|tespit|belirlenemedi|bilgi yok|bilinmeyen|belirsiz/i }
        });

        globalFrauds = 5;
        await statsCollection.updateOne(
            { id: 'global' },
            { $set: { globalFrauds: 5 } },
            { upsert: true }
        );

        recentFeed = await feedCollection.find().sort({ time: -1 }).limit(10).toArray();

        res.send(
            "<h1 style='color:green;'>Temizlik Basarili!</h1><p>Troll ilanlar silindi, dolandirici sayisi 5 yapildi. Kendi siteni yenileyebilirsin.</p>"
        );
    } catch (error) {
        res.send(`Hata: ${error.message}`);
    }
});

const PORT = process.env.PORT || 3000;

cron.schedule('* * * * *', checkPriceAlarms);

app.listen(PORT, () => {
    console.log(`Sunucu aktif: ${PORT}`);
});
