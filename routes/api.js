const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Tüm Controllerlar
const { addAlarm, getMyAlarms, deleteAlarm } = require('../controllers/alarmController');
const { analyzeProduct } = require('../controllers/analyzeController');
const { getRecentFeed, getGlobalStats } = require('../controllers/feedController');

// --- ANALİZ ---
router.post('/analyze', upload.single('image'), analyzeProduct);

// --- RADAR & İSTATİSTİK ---
router.get('/recent-feed', getRecentFeed);
router.get('/global-stats', getGlobalStats);

// --- ALARMLAR ---
router.post('/add-alarm', addAlarm);
router.get('/my-alarms', getMyAlarms);
router.post('/delete-alarm', deleteAlarm);

module.exports = router;