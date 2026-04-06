const express = require('express');
const router = express.Router();
const multer = require('multer');

// Resim yükleme ayarı (Hafıza limitini 10MB yaptık)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Controller bağlantıları (Az önce oluşturduğumuz dosyalar)
const { addAlarm, getMyAlarms, deleteAlarm } = require('../controllers/alarmController');
const { analyzeProduct } = require('../controllers/analyzeController');

// --- ANALİZ ROTASI ---
// 'image' etiketiyle gelen dosyayı multer ile yakalayıp analyzeProduct'a gönderir
router.post('/analyze', upload.single('image'), analyzeProduct);

// --- ALARM ROTARI ---
router.post('/add-alarm', addAlarm);
router.get('/my-alarms', getMyAlarms);
router.post('/delete-alarm', deleteAlarm);

module.exports = router;