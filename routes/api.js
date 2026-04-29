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
const { googleAuth } = require('../controllers/authController');
const { connectDB } = require('../config/db');
const { freshStart } = require('../controllers/maintenanceController');

// Vercel cold boot DB connection middleware
router.use(async (req, res, next) => {
    await connectDB();
    next();
});

// --- VERİTABANI ---
router.get('/database', (req, res) => {
    res.json(piyasaVeritabani);
});

// --- AUTH ---
router.post('/auth/google', googleAuth);

// --- ANALİZ ---
router.post('/analyze', upload.array('images', 3), analyzeProduct);
router.get('/analysis/:id', getAnalysisById);
router.post('/report-fraud', reportFraud);

// --- FEED & STATS ---
router.get('/global-stats', getGlobalStats);
router.get('/recent-feed', getRecentFeed);

// --- ALARMLAR ---
router.post('/add-alarm', addAlarm);
router.get('/my-alarms', getMyAlarms);
router.delete('/delete-alarm', deleteAlarm); // main.js uses DELETE

// --- MAINTENANCE ---
router.get('/maintenance/fresh-start', freshStart);

module.exports = router;