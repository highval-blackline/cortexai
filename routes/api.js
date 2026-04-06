const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

const { addAlarm, getMyAlarms, deleteAlarm } = require('../controllers/alarmController');
const { analyzeProduct } = require('../controllers/analyzeController');

// --- ANALİZ VE RAPOR ---
router.post('/analyze', upload.single('image'), analyzeProduct);
router.get('/analysis/:id', (req, res) => { /* Analiz detayını getir */ }); 
router.post('/report-fraud', (req, res) => { res.json({ success: true }); });

// --- ALARMLAR ---
router.post('/add-alarm', addAlarm);
router.get('/my-alarms', getMyAlarms);
router.post('/delete-alarm', deleteAlarm);

// --- AUTH (Google Giriş) ---
router.post('/auth/google', (req, res) => { /* Google login işlemini buraya taşıyacağız */ });

module.exports = router;