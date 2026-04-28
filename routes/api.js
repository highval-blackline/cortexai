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
const { connectDB } = require('../config/db');

// Vercel cold boot DB connection middleware
router.use(async (req, res, next) => {
    await connectDB();
    next();
});

// --- VERİTABANI ---
router.get('/database', (req, res) => {
    res.json(piyasaVeritabani);
});

// --- ANALİZ (TEST MODE) ---
router.post('/analyze', (req, res) => {
  res.json({
    success: true,
    message: "test analiz çalıştı"
  });
});

// --- SABİT DATA ---
router.get('/global-stats', (req, res) => {
  res.json({ globalFrauds: 0 });
});

router.get('/recent-feed', (req, res) => {
  res.json([]);
});

// --- ALARMLAR ---
router.post('/add-alarm', addAlarm);
router.get('/my-alarms', getMyAlarms);
router.post('/delete-alarm', deleteAlarm);

module.exports = router;