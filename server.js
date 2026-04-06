require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const apiRoutes = require('./routes/api');
const piyasaVeritabani = require('./database.js'); // Statik fiyat listesi

const app = express();
const PORT = process.env.PORT || 3000;

// --- MİDDLEWARE (Ara Yazılımlar) ---
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// --- STATİK DOSYALAR ---
// Bu satır, public klasöründeki index.html, main.js gibi dosyaların internette görünmesini sağlar
app.use(express.static(path.join(__dirname, 'public')));

// --- VERİTABANI BAĞLANTISI ---
connectDB();

// --- API ROTARI ---
// Tüm API istekleri artık /api ile başlayacak (Örn: /api/analyze)
app.use('/api', apiRoutes);

// --- ANA SAYFA YÖNLENDİRMESİ ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda tıkır tıkır çalışıyor.`);
});

module.exports = app;