const { getDB } = require('../config/db');

const addAlarm = async (req, res) => {
    const { email, model, targetPrice } = req.body;
    const db = getDB().db;

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
};

const getMyAlarms = async (req, res) => {
    const email = req.query.email;
    const db = getDB().db;

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
};

const deleteAlarm = async (req, res) => {
    const { email, model } = req.body;
    const db = getDB().db;

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
};

module.exports = { addAlarm, getMyAlarms, deleteAlarm };