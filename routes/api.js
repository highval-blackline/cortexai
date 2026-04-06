const piyasaVeritabani = require('../database.js');
const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

const { addAlarm, getMyAlarms, deleteAlarm } = require('../controllers/alarmController');
const { analyzeProduct, getAnalysisById, reportFraud } = require('../controllers/analyzeController');
const { getRecentFeed, getGlobalStats } = require('../controllers/feedController');

// --- VERİTABANI (Fiyat Listesi) ---
router.get('/database', (req, res) => {
    res.json(piyasaVeritabani);
});

// --- ANALİZ VE RADAR ---
router.post('/analyze', upload.single('image'), analyzeProduct);
router.get('/analysis/:id', getAnalysisById);
router.post('/report-fraud', reportFraud);
router.get('/recent-feed', getRecentFeed);
router.get('/global-stats', getGlobalStats);

// --- ALARMLAR ---
router.post('/add-alarm', addAlarm);
router.get('/my-alarms', getMyAlarms);
router.post('/delete-alarm', deleteAlarm);

module.exports = router;