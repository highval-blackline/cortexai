const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cloudinary = require('cloudinary').v2;
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors({ origin: '*' }));

// YENİ: Tek resim yerine dizi (array) halinde en fazla 3 resim kabul eder.
const upload = multer({ storage: multer.memoryStorage() });

const MONGO_URI = "mongodb+srv://highvalblackline:b7sqHIPMmvuzn96D@cluster0.wvurezv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(MONGO_URI);
let db, statsCollection, feedCollection;

// İstatistiklerin hazır olup olmadığını takip eden bayrak
let isStatsReady = false;

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

        recentFeed = await feedCollection.find().sort({ time: -1 }).limit(6).toArray();

        isStatsReady = true;
    } catch (err) {
        console.error("❌ MongoDB Bağlantı Hatası:", err);
        isStatsReady = false;
    }
}

// /stats isteği geldiğinde, istatistiklerin hazır olmasını beklemek için küçük yardımcı
async function waitForStatsReady(maxWaitMs = 3000, stepMs = 100) {
    const start = Date.now();
    while (!isStatsReady && Date.now() - start < maxWaitMs) {
        await delay(stepMs);
    }
    return isStatsReady;
}

const piyasaVeritabani = {
    // ==========================================
    //               APPLE iPHONE
    // ==========================================
    "iPhone 17 Pro Max": { "TR_Sifir": "120.000 TL - 135.000 TL", "TR_IkinciEl": "105.000 TL - 115.000 TL", "YurtDisi_Sifir": "65.000 TL - 75.000 TL", "YurtDisi_IkinciEl": "55.000 TL - 60.000 TL" },
    "iPhone 17 Pro": { "TR_Sifir": "105.000 TL - 115.000 TL", "TR_IkinciEl": "90.000 TL - 100.000 TL", "YurtDisi_Sifir": "55.000 TL - 65.000 TL", "YurtDisi_IkinciEl": "48.000 TL - 53.000 TL" },
    "iPhone 17 Plus": { "TR_Sifir": "95.000 TL - 105.000 TL", "TR_IkinciEl": "80.000 TL - 90.000 TL", "YurtDisi_Sifir": "50.000 TL - 55.000 TL", "YurtDisi_IkinciEl": "43.000 TL - 48.000 TL" },
    "iPhone Air": { "TR_Sifir": "68.500 TL - 86.500 TL", "TR_IkinciEl": "55.000 TL - 62.000 TL", "YurtDisi_Sifir": "38.000 TL - 45.000 TL", "YurtDisi_IkinciEl": "30.000 TL - 35.000 TL" },
    "iPhone 17": { "TR_Sifir": "85.000 TL - 95.000 TL", "TR_IkinciEl": "75.000 TL - 80.000 TL", "YurtDisi_Sifir": "45.000 TL - 50.000 TL", "YurtDisi_IkinciEl": "38.000 TL - 43.000 TL" },
    "iPhone 16 Pro Max": { "TR_Sifir": "105.000 TL - 110.000 TL", "TR_IkinciEl": "85.000 TL - 95.000 TL", "YurtDisi_Sifir": "55.000 TL - 60.000 TL", "YurtDisi_IkinciEl": "45.000 TL - 50.000 TL" },
    "iPhone 16 Pro": { "TR_Sifir": "95.000 TL - 100.000 TL", "TR_IkinciEl": "75.000 TL - 85.000 TL", "YurtDisi_Sifir": "48.000 TL - 53.000 TL", "YurtDisi_IkinciEl": "40.000 TL - 45.000 TL" },
    "iPhone 16 Plus": { "TR_Sifir": "85.000 TL - 90.000 TL", "TR_IkinciEl": "65.000 TL - 75.000 TL", "YurtDisi_Sifir": "43.000 TL - 48.000 TL", "YurtDisi_IkinciEl": "35.000 TL - 40.000 TL" },
    "iPhone 16": { "TR_Sifir": "75.000 TL - 80.000 TL", "TR_IkinciEl": "60.000 TL - 65.000 TL", "YurtDisi_Sifir": "40.000 TL - 45.000 TL", "YurtDisi_IkinciEl": "32.000 TL - 36.000 TL" },
    "iPhone 15 Pro Max": { "TR_Sifir": "90.000 TL - 95.000 TL", "TR_IkinciEl": "70.000 TL - 80.000 TL", "YurtDisi_Sifir": "48.000 TL - 52.000 TL", "YurtDisi_IkinciEl": "38.000 TL - 42.000 TL" },
    "iPhone 15 Pro": { "TR_Sifir": "80.000 TL - 85.000 TL", "TR_IkinciEl": "60.000 TL - 70.000 TL", "YurtDisi_Sifir": "42.000 TL - 46.000 TL", "YurtDisi_IkinciEl": "32.000 TL - 36.000 TL" },
    "iPhone 15 Plus": { "TR_Sifir": "70.000 TL - 75.000 TL", "TR_IkinciEl": "55.000 TL - 60.000 TL", "YurtDisi_Sifir": "36.000 TL - 40.000 TL", "YurtDisi_IkinciEl": "28.000 TL - 32.000 TL" },
    "iPhone 15": { "TR_Sifir": "60.000 TL - 65.000 TL", "TR_IkinciEl": "48.000 TL - 55.000 TL", "YurtDisi_Sifir": "32.000 TL - 36.000 TL", "YurtDisi_IkinciEl": "25.000 TL - 28.000 TL" },
    "iPhone 14 Pro Max": { "TR_Sifir": "80.000 TL", "TR_IkinciEl": "55.000 TL - 65.000 TL", "YurtDisi_Sifir": "45.000 TL", "YurtDisi_IkinciEl": "35.000 TL - 42.000 TL" },
    "iPhone 14 Pro": { "TR_Sifir": "72.000 TL", "TR_IkinciEl": "48.000 TL - 55.000 TL", "YurtDisi_Sifir": "40.000 TL", "YurtDisi_IkinciEl": "30.000 TL - 35.000 TL" },
    "iPhone 14 Plus": { "TR_Sifir": "60.000 TL", "TR_IkinciEl": "40.000 TL - 46.000 TL", "YurtDisi_Sifir": "32.000 TL", "YurtDisi_IkinciEl": "22.000 TL - 26.000 TL" },
    "iPhone 14": { "TR_Sifir": "45.000 TL - 50.000 TL", "TR_IkinciEl": "35.000 TL - 42.000 TL", "YurtDisi_Sifir": "25.000 TL", "YurtDisi_IkinciEl": "18.000 TL - 22.000 TL" },
    "iPhone 13 Pro Max": { "TR_IkinciEl": "42.000 TL - 48.000 TL", "YurtDisi_IkinciEl": "25.000 TL - 28.000 TL" },
    "iPhone 13 Pro": { "TR_IkinciEl": "35.000 TL - 40.000 TL", "YurtDisi_IkinciEl": "20.000 TL - 24.000 TL" },
    "iPhone 13": { "TR_Sifir": "36.000 TL - 39.000 TL", "TR_IkinciEl": "28.000 TL - 33.000 TL", "YurtDisi_Sifir": "15.000 TL - 18.000 TL" },
    "iPhone 13 Mini": { "TR_IkinciEl": "24.000 TL - 28.000 TL", "YurtDisi_IkinciEl": "12.000 TL - 15.000 TL" },
    "iPhone 12 Pro Max": { "TR_IkinciEl": "24.000 TL - 28.000 TL", "YurtDisi_Sifir": "12.000 TL - 15.000 TL" },
    "iPhone 12 Pro": { "TR_IkinciEl": "20.000 TL - 25.000 TL", "YurtDisi_IkinciEl": "10.000 TL - 13.000 TL" },
    "iPhone 12": { "TR_IkinciEl": "16.000 TL - 20.000 TL", "YurtDisi_IkinciEl": "8.000 TL - 11.000 TL" },
    "iPhone 12 Mini": { "TR_IkinciEl": "14.000 TL - 17.000 TL", "YurtDisi_IkinciEl": "7.000 TL - 9.000 TL" },
    "iPhone 11 Pro Max": { "TR_IkinciEl": "15.000 TL - 18.000 TL", "YurtDisi_IkinciEl": "7.000 TL - 9.000 TL" },
    "iPhone 11 Pro": { "TR_IkinciEl": "13.000 TL - 16.000 TL", "YurtDisi_IkinciEl": "6.000 TL - 8.000 TL" },
    "iPhone 11": { "TR_Sifir": "28.000 TL - 38.000 TL", "TR_IkinciEl": "10.000 TL - 14.000 TL", "YurtDisi_IkinciEl": "5.000 TL - 7.000 TL" },
    "iPhone XS Max": { "TR_IkinciEl": "8.000 TL - 11.000 TL", "YurtDisi_IkinciEl": "4.000 TL - 6.000 TL" },
    "iPhone XS": { "TR_IkinciEl": "7.000 TL - 10.000 TL", "YurtDisi_IkinciEl": "3.500 TL - 5.000 TL" },
    "iPhone XR": { "TR_IkinciEl": "7.000 TL - 9.500 TL", "YurtDisi_IkinciEl": "3.000 TL - 4.500 TL" },
    "iPhone X": { "TR_IkinciEl": "6.000 TL - 8.000 TL", "YurtDisi_IkinciEl": "3.000 TL - 4.000 TL" },
    "iPhone 8 Plus": { "TR_IkinciEl": "4.000 TL - 6.000 TL", "YurtDisi_IkinciEl": "2.000 TL - 3.000 TL" },
    "iPhone 8": { "TR_IkinciEl": "3.000 TL - 4.500 TL", "YurtDisi_IkinciEl": "1.500 TL - 2.000 TL" },
    "iPhone 7 Plus": { "TR_IkinciEl": "3.000 TL - 4.500 TL", "YurtDisi_IkinciEl": "1.500 TL - 2.000 TL" },
    "iPhone 7": { "TR_IkinciEl": "2.000 TL - 3.500 TL", "YurtDisi_IkinciEl": "1.000 TL - 1.500 TL" },
    "iPhone SE 4 (2025)": { "TR_Sifir": "35.000 TL - 40.000 TL", "TR_IkinciEl": "28.000 TL - 32.000 TL", "YurtDisi_Sifir": "18.000 TL - 22.000 TL", "YurtDisi_IkinciEl": "14.000 TL - 17.000 TL" },
    "iPhone SE 3 (2022)": { "TR_IkinciEl": "15.000 TL - 20.000 TL", "YurtDisi_IkinciEl": "7.000 TL - 10.000 TL" },
    "iPhone SE 2 (2020)": { "TR_IkinciEl": "8.000 TL - 12.000 TL", "YurtDisi_IkinciEl": "4.000 TL - 6.000 TL" },
    "iPhone SE 1 (2016)": { "TR_IkinciEl": "1.500 TL - 3.000 TL", "YurtDisi_IkinciEl": "500 TL - 1.000 TL" },
    "iPhone 6s Plus": { "TR_IkinciEl": "1.500 TL - 2.500 TL" },
    "iPhone 6s": { "TR_IkinciEl": "1.000 TL - 2.000 TL" },
    "iPhone 6 Plus": { "TR_IkinciEl": "1.000 TL - 1.800 TL" },
    "iPhone 6": { "TR_IkinciEl": "800 TL - 1.500 TL" },
    "iPhone 5s": { "TR_IkinciEl": "500 TL - 1.000 TL" },
    "iPhone 5c": { "TR_IkinciEl": "400 TL - 800 TL" },
    "iPhone 5": { "TR_IkinciEl": "400 TL - 800 TL" },

    // ==========================================
    //               SAMSUNG GALAXY
    // ==========================================
    "Galaxy S26 Ultra": { "TR_Sifir": "105.000 TL - 115.000 TL", "TR_IkinciEl": "95.000 TL - 100.000 TL", "YurtDisi_Sifir": "55.000 TL - 62.000 TL", "YurtDisi_IkinciEl": "48.000 TL - 53.000 TL" },
    "Galaxy S26+": { "TR_Sifir": "85.000 TL - 92.000 TL", "TR_IkinciEl": "75.000 TL - 80.000 TL", "YurtDisi_Sifir": "45.000 TL - 50.000 TL", "YurtDisi_IkinciEl": "38.000 TL - 42.000 TL" },
    "Galaxy S26": { "TR_Sifir": "72.000 TL - 78.000 TL", "TR_IkinciEl": "62.000 TL - 68.000 TL", "YurtDisi_Sifir": "38.000 TL - 42.000 TL", "YurtDisi_IkinciEl": "32.000 TL - 36.000 TL" },
    "Galaxy S25 Ultra": { "TR_Sifir": "90.000 TL - 98.000 TL", "TR_IkinciEl": "78.000 TL - 85.000 TL", "YurtDisi_Sifir": "45.000 TL - 50.000 TL", "YurtDisi_IkinciEl": "38.000 TL - 43.000 TL" },
    "Galaxy S25+": { "TR_Sifir": "70.000 TL - 76.000 TL", "TR_IkinciEl": "60.000 TL - 66.000 TL", "YurtDisi_Sifir": "36.000 TL - 40.000 TL", "YurtDisi_IkinciEl": "30.000 TL - 34.000 TL" },
    "Galaxy S25": { "TR_Sifir": "60.000 TL - 66.000 TL", "TR_IkinciEl": "50.000 TL - 56.000 TL", "YurtDisi_Sifir": "30.000 TL - 34.000 TL", "YurtDisi_IkinciEl": "26.000 TL - 29.000 TL" },
    "Galaxy S24 Ultra": { "TR_Sifir": "70.000 TL - 76.000 TL", "TR_IkinciEl": "58.000 TL - 65.000 TL", "YurtDisi_Sifir": "35.000 TL - 40.000 TL", "YurtDisi_IkinciEl": "28.000 TL - 33.000 TL" },
    "Galaxy S24+": { "TR_Sifir": "55.000 TL - 60.000 TL", "TR_IkinciEl": "44.000 TL - 50.000 TL", "YurtDisi_Sifir": "28.000 TL - 32.000 TL", "YurtDisi_IkinciEl": "22.000 TL - 26.000 TL" },
    "Galaxy S24": { "TR_Sifir": "48.000 TL - 53.000 TL", "TR_IkinciEl": "38.000 TL - 44.000 TL", "YurtDisi_Sifir": "24.000 TL - 28.000 TL", "YurtDisi_IkinciEl": "19.000 TL - 23.000 TL" },
    "Galaxy S24 FE": { "TR_Sifir": "34.000 TL - 38.000 TL", "TR_IkinciEl": "26.000 TL - 31.000 TL", "YurtDisi_Sifir": "18.000 TL - 22.000 TL", "YurtDisi_IkinciEl": "14.000 TL - 17.000 TL" },
    "Galaxy S23 Ultra": { "TR_IkinciEl": "45.000 TL - 52.000 TL" },
    "Galaxy S23+": { "TR_IkinciEl": "34.000 TL - 39.000 TL" },
    "Galaxy S23": { "TR_IkinciEl": "28.000 TL - 33.000 TL" },
    "Galaxy S23 FE": { "TR_IkinciEl": "20.000 TL - 24.000 TL" },
    "Galaxy S22 Ultra": { "TR_IkinciEl": "32.000 TL - 38.000 TL" },
    "Galaxy S22+": { "TR_IkinciEl": "22.000 TL - 26.000 TL" },
    "Galaxy S22": { "TR_IkinciEl": "17.000 TL - 21.000 TL" },
    "Galaxy S21 Ultra": { "TR_IkinciEl": "22.000 TL - 27.000 TL" },
    "Galaxy S21+": { "TR_IkinciEl": "15.000 TL - 18.000 TL" },
    "Galaxy S21": { "TR_IkinciEl": "12.000 TL - 15.000 TL" },
    "Galaxy S21 FE": { "TR_IkinciEl": "13.000 TL - 16.000 TL" },
    "Galaxy S20 Ultra": { "TR_IkinciEl": "15.000 TL - 18.000 TL" },
    "Galaxy S20+": { "TR_IkinciEl": "10.000 TL - 13.000 TL" },
    "Galaxy S20": { "TR_IkinciEl": "8.500 TL - 11.000 TL" },
    "Galaxy S20 FE": { "TR_IkinciEl": "9.000 TL - 12.000 TL" },
    "Galaxy S10+": { "TR_IkinciEl": "6.500 TL - 8.500 TL" },
    "Galaxy S10": { "TR_IkinciEl": "5.500 TL - 7.500 TL" },
    "Galaxy S10e": { "TR_IkinciEl": "4.500 TL - 6.000 TL" },
    "Galaxy S10 Lite": { "TR_IkinciEl": "5.000 TL - 7.000 TL" },
    "Galaxy S9+": { "TR_IkinciEl": "4.000 TL - 5.500 TL" },
    "Galaxy S9": { "TR_IkinciEl": "3.200 TL - 4.500 TL" },
    "Galaxy S8+": { "TR_IkinciEl": "2.800 TL - 3.800 TL" },
    "Galaxy S8": { "TR_IkinciEl": "2.200 TL - 3.200 TL" },
    "Galaxy S7 Edge": { "TR_IkinciEl": "1.500 TL - 2.200 TL" },
    "Galaxy S7": { "TR_IkinciEl": "1.000 TL - 1.600 TL" },
    "Galaxy Z Fold 7": { "TR_Sifir": "95.000 TL - 105.000 TL", "TR_IkinciEl": "80.000 TL - 88.000 TL", "YurtDisi_Sifir": "50.000 TL - 58.000 TL", "YurtDisi_IkinciEl": "42.000 TL - 48.000 TL" },
    "Galaxy Z Flip 7": { "TR_Sifir": "60.000 TL - 68.000 TL", "TR_IkinciEl": "48.000 TL - 55.000 TL", "YurtDisi_Sifir": "35.000 TL - 40.000 TL", "YurtDisi_IkinciEl": "28.000 TL - 32.000 TL" },
    "Galaxy Z Fold Special Edition": { "TR_Sifir": "Özel İthalat (Ort: 110.000 TL)", "TR_IkinciEl": "85.000 TL - 95.000 TL", "YurtDisi_Sifir": "60.000 TL - 68.000 TL", "YurtDisi_IkinciEl": "50.000 TL - 55.000 TL" },
    "Galaxy Z Fold 6": { "TR_Sifir": "80.000 TL - 88.000 TL", "TR_IkinciEl": "65.000 TL - 72.000 TL", "YurtDisi_Sifir": "42.000 TL - 48.000 TL", "YurtDisi_IkinciEl": "34.000 TL - 39.000 TL" },
    "Galaxy Z Flip 6": { "TR_Sifir": "52.000 TL - 58.000 TL", "TR_IkinciEl": "40.000 TL - 46.000 TL", "YurtDisi_Sifir": "28.000 TL - 33.000 TL", "YurtDisi_IkinciEl": "22.000 TL - 26.000 TL" },
    "Galaxy Z Fold 5": { "TR_IkinciEl": "45.000 TL - 52.000 TL" },
    "Galaxy Z Flip 5": { "TR_IkinciEl": "28.000 TL - 34.000 TL" },
    "Galaxy Z Fold 4": { "TR_IkinciEl": "30.000 TL - 36.000 TL" },
    "Galaxy Z Flip 4": { "TR_IkinciEl": "18.000 TL - 23.000 TL" },
    "Galaxy Z Fold 3": { "TR_IkinciEl": "20.000 TL - 25.000 TL" },
    "Galaxy Z Flip 3": { "TR_IkinciEl": "12.000 TL - 16.000 TL" },
    "Galaxy Z Fold 2": { "TR_IkinciEl": "14.000 TL - 18.000 TL" },
    "Galaxy Z Flip": { "TR_IkinciEl": "8.000 TL - 11.000 TL" },
    "Galaxy Fold": { "TR_IkinciEl": "9.000 TL - 13.000 TL" },
    "Galaxy Note 20 Ultra": { "TR_IkinciEl": "20.000 TL - 25.000 TL" },
    "Galaxy Note 20": { "TR_IkinciEl": "15.000 TL - 19.000 TL" },
    "Galaxy Note 10+": { "TR_IkinciEl": "11.000 TL - 14.000 TL" },
    "Galaxy Note 10": { "TR_IkinciEl": "8.500 TL - 11.000 TL" },
    "Galaxy Note 10 Lite": { "TR_IkinciEl": "7.500 TL - 9.500 TL" },
    "Galaxy Note 9": { "TR_IkinciEl": "5.500 TL - 7.500 TL" },
    "Galaxy Note 8": { "TR_IkinciEl": "4.000 TL - 5.500 TL" },
    "Galaxy Note FE": { "TR_IkinciEl": "2.500 TL - 3.500 TL" },
    "Galaxy Note 7": { "TR_IkinciEl": "Koleksiyonluk / Riskli Cihaz" },
    "Galaxy A56": { "TR_Sifir": "30.000 TL - 34.000 TL", "TR_IkinciEl": "24.000 TL - 28.000 TL", "YurtDisi_Sifir": "15.000 TL - 18.000 TL", "YurtDisi_IkinciEl": "11.000 TL - 14.000 TL" },
    "Galaxy A36": { "TR_Sifir": "24.000 TL - 28.000 TL", "TR_IkinciEl": "19.000 TL - 23.000 TL", "YurtDisi_Sifir": "12.000 TL - 15.000 TL", "YurtDisi_IkinciEl": "9.000 TL - 11.000 TL" },
    "Galaxy A26": { "TR_Sifir": "18.000 TL - 22.000 TL", "TR_IkinciEl": "14.000 TL - 17.000 TL", "YurtDisi_Sifir": "9.500 TL - 12.000 TL", "YurtDisi_IkinciEl": "7.500 TL - 9.000 TL" },
    "Galaxy A16": { "TR_Sifir": "13.000 TL - 16.000 TL", "TR_IkinciEl": "10.000 TL - 13.000 TL", "YurtDisi_Sifir": "7.000 TL - 9.000 TL", "YurtDisi_IkinciEl": "5.500 TL - 7.000 TL" },
    "Galaxy A55 5G": { "TR_Sifir": "22.000 TL - 25.000 TL", "TR_IkinciEl": "17.000 TL - 21.000 TL", "YurtDisi_Sifir": "11.000 TL - 14.000 TL", "YurtDisi_IkinciEl": "8.500 TL - 10.500 TL" },
    "Galaxy A35 5G": { "TR_Sifir": "17.000 TL - 20.000 TL", "TR_IkinciEl": "13.000 TL - 16.000 TL", "YurtDisi_Sifir": "9.000 TL - 11.000 TL", "YurtDisi_IkinciEl": "7.000 TL - 8.500 TL" },
    "Galaxy A25 5G": { "TR_Sifir": "13.000 TL - 16.000 TL", "TR_IkinciEl": "10.000 TL - 13.000 TL", "YurtDisi_Sifir": "7.500 TL - 9.500 TL", "YurtDisi_IkinciEl": "5.500 TL - 7.000 TL" },
    "Galaxy A15": { "TR_Sifir": "10.000 TL - 12.000 TL", "TR_IkinciEl": "7.500 TL - 9.500 TL", "YurtDisi_Sifir": "5.500 TL - 7.000 TL", "YurtDisi_IkinciEl": "4.000 TL - 5.500 TL" },
    "Galaxy A05s": { "TR_Sifir": "8.500 TL - 10.500 TL", "TR_IkinciEl": "6.000 TL - 8.000 TL", "YurtDisi_Sifir": "4.500 TL - 6.000 TL", "YurtDisi_IkinciEl": "3.500 TL - 4.500 TL" },
    "Galaxy A05": { "TR_Sifir": "7.000 TL - 8.500 TL", "TR_IkinciEl": "5.000 TL - 6.500 TL", "YurtDisi_Sifir": "4.000 TL - 5.000 TL", "YurtDisi_IkinciEl": "3.000 TL - 4.000 TL" },
    "Galaxy A54 5G": { "TR_IkinciEl": "13.000 TL - 16.000 TL" },
    "Galaxy A34 5G": { "TR_IkinciEl": "10.000 TL - 13.000 TL" },
    "Galaxy A24": { "TR_IkinciEl": "8.000 TL - 10.000 TL" },
    "Galaxy A14": { "TR_IkinciEl": "6.000 TL - 8.000 TL" },
    "Galaxy A04s": { "TR_IkinciEl": "4.500 TL - 6.000 TL" },
    "Galaxy A04e": { "TR_IkinciEl": "3.500 TL - 5.000 TL" },
    "Galaxy A04": { "TR_IkinciEl": "4.000 TL - 5.500 TL" },
    "Galaxy A73 5G": { "TR_IkinciEl": "14.000 TL - 17.000 TL" },
    "Galaxy A53 5G": { "TR_IkinciEl": "10.000 TL - 13.000 TL" },
    "Galaxy A33 5G": { "TR_IkinciEl": "8.000 TL - 10.500 TL" },
    "Galaxy A23": { "TR_IkinciEl": "6.500 TL - 8.500 TL" },
    "Galaxy A13": { "TR_IkinciEl": "5.000 TL - 6.500 TL" },
    "Galaxy A03s": { "TR_IkinciEl": "3.500 TL - 4.500 TL" },
    "Galaxy A03": { "TR_IkinciEl": "3.000 TL - 4.200 TL" },
    "Galaxy A03 Core": { "TR_IkinciEl": "2.500 TL - 3.500 TL" },
    "Galaxy A72": { "TR_IkinciEl": "9.000 TL - 12.000 TL" },
    "Galaxy A52s 5G": { "TR_IkinciEl": "8.500 TL - 11.500 TL" },
    "Galaxy A52": { "TR_IkinciEl": "7.500 TL - 9.500 TL" },
    "Galaxy A32": { "TR_IkinciEl": "6.000 TL - 8.000 TL" },
    "Galaxy A22": { "TR_IkinciEl": "5.500 TL - 7.500 TL" },
    "Galaxy A12": { "TR_IkinciEl": "4.500 TL - 6.000 TL" },
    "Galaxy A02s": { "TR_IkinciEl": "3.200 TL - 4.500 TL" },
    "Galaxy A02": { "TR_IkinciEl": "2.800 TL - 3.800 TL" },
    "Galaxy A71": { "TR_IkinciEl": "7.000 TL - 9.000 TL" },
    "Galaxy A51": { "TR_IkinciEl": "5.500 TL - 7.500 TL" },
    "Galaxy A31": { "TR_IkinciEl": "4.500 TL - 6.000 TL" },
    "Galaxy A21s": { "TR_IkinciEl": "4.000 TL - 5.500 TL" },
    "Galaxy A11": { "TR_IkinciEl": "3.000 TL - 4.200 TL" },
    "Galaxy A01": { "TR_IkinciEl": "2.000 TL - 3.000 TL" },
    "Galaxy A01 Core": { "TR_IkinciEl": "1.500 TL - 2.500 TL" },
    "Galaxy A80": { "TR_IkinciEl": "6.000 TL - 8.000 TL" },
    "Galaxy A70": { "TR_IkinciEl": "4.500 TL - 6.500 TL" },
    "Galaxy A50": { "TR_IkinciEl": "3.500 TL - 5.000 TL" },
    "Galaxy A40": { "TR_IkinciEl": "3.000 TL - 4.200 TL" },
    "Galaxy A30s": { "TR_IkinciEl": "3.200 TL - 4.500 TL" },
    "Galaxy A30": { "TR_IkinciEl": "2.800 TL - 4.000 TL" },
    "Galaxy A20s": { "TR_IkinciEl": "2.600 TL - 3.800 TL" },
    "Galaxy A20": { "TR_IkinciEl": "2.400 TL - 3.500 TL" },
    "Galaxy A10s": { "TR_IkinciEl": "2.200 TL - 3.200 TL" },
    "Galaxy A10": { "TR_IkinciEl": "2.000 TL - 2.800 TL" },
    "Galaxy A9 (2018)": { "TR_IkinciEl": "3.000 TL - 4.500 TL" },
    "Galaxy A8+ (2018)": { "TR_IkinciEl": "2.500 TL - 3.500 TL" },
    "Galaxy A8 (2018)": { "TR_IkinciEl": "2.200 TL - 3.200 TL" },
    "Galaxy A7 (2018)": { "TR_IkinciEl": "2.000 TL - 3.000 TL" },
    "Galaxy A6+": { "TR_IkinciEl": "1.800 TL - 2.600 TL" },
    "Galaxy A6": { "TR_IkinciEl": "1.500 TL - 2.200 TL" },
    "Galaxy A7 (2017)": { "TR_IkinciEl": "1.200 TL - 1.800 TL" },
    "Galaxy A5 (2017)": { "TR_IkinciEl": "1.000 TL - 1.500 TL" },
    "Galaxy A3 (2017)": { "TR_IkinciEl": "800 TL - 1.200 TL" },
    "Galaxy A7 (2016)": { "TR_IkinciEl": "800 TL - 1.200 TL" },
    "Galaxy A5 (2016)": { "TR_IkinciEl": "700 TL - 1.000 TL" },
    "Galaxy A3 (2016)": { "TR_IkinciEl": "500 TL - 800 TL" },
    "Galaxy XCover 7": { "TR_Sifir": "18.000 TL - 22.000 TL", "TR_IkinciEl": "14.000 TL - 17.000 TL", "YurtDisi_Sifir": "10.000 TL - 13.000 TL", "YurtDisi_IkinciEl": "7.500 TL - 9.500 TL" },
    "Galaxy XCover 5": { "TR_IkinciEl": "4.000 TL - 6.000 TL" },
    "Galaxy XCover 4": { "TR_IkinciEl": "1.500 TL - 2.500 TL" },
    "Galaxy C9 Pro": { "TR_IkinciEl": "1.800 TL - 2.600 TL" },
    "Galaxy C7": { "TR_IkinciEl": "1.200 TL - 1.800 TL" },
    "Galaxy C5": { "TR_IkinciEl": "900 TL - 1.400 TL" },

    // ==========================================
    //               XIAOMI / REDMI / POCO
    // ==========================================
    "Xiaomi 17 Ultra": { "TR_Sifir": "90.000 TL", "TR_IkinciEl": "65.000 TL", "YurtDisi_Sifir": "40.000 TL", "YurtDisi_IkinciEl": "33.000 TL" },
    "Xiaomi 17 Pro Max": { "TR_Sifir": "85.000 TL", "TR_IkinciEl": "62.000 TL", "YurtDisi_Sifir": "38.000 TL", "YurtDisi_IkinciEl": "31.000 TL" },
    "Xiaomi 17 Pro": { "TR_Sifir": "75.000 TL", "TR_IkinciEl": "55.000 TL", "YurtDisi_Sifir": "33.000 TL", "YurtDisi_IkinciEl": "27.000 TL" },
    "Xiaomi 17": { "TR_Sifir": "65.000 TL", "TR_IkinciEl": "48.000 TL", "YurtDisi_Sifir": "28.000 TL", "YurtDisi_IkinciEl": "23.000 TL" },
    "Xiaomi 15 Ultra": { "TR_Sifir": "75.000 TL", "TR_IkinciEl": "55.000 TL", "YurtDisi_Sifir": "32.000 TL", "YurtDisi_IkinciEl": "26.000 TL" },
    "Xiaomi 15": { "TR_Sifir": "55.000 TL", "TR_IkinciEl": "40.000 TL", "YurtDisi_Sifir": "24.000 TL", "YurtDisi_IkinciEl": "20.000 TL" },
    "Xiaomi 15T Pro": { "TR_Sifir": "45.000 TL", "TR_IkinciEl": "33.000 TL", "YurtDisi_Sifir": "20.000 TL", "YurtDisi_IkinciEl": "16.000 TL" },
    "Xiaomi 15T": { "TR_Sifir": "38.000 TL", "TR_IkinciEl": "28.000 TL", "YurtDisi_Sifir": "17.000 TL", "YurtDisi_IkinciEl": "14.000 TL" },
    "Xiaomi 14 Ultra": { "TR_Sifir": "60.000 TL", "TR_IkinciEl": "45.000 TL", "YurtDisi_Sifir": "26.000 TL", "YurtDisi_IkinciEl": "21.000 TL" },
    "Xiaomi 14": { "TR_Sifir": "42.000 TL", "TR_IkinciEl": "32.000 TL", "YurtDisi_Sifir": "19.000 TL", "YurtDisi_IkinciEl": "15.000 TL" },
    "Xiaomi 14T Pro": { "TR_Sifir": "35.000 TL", "TR_IkinciEl": "26.000 TL", "YurtDisi_Sifir": "16.000 TL", "YurtDisi_IkinciEl": "13.000 TL" },
    "Xiaomi 14T": { "TR_Sifir": "28.000 TL", "TR_IkinciEl": "21.000 TL", "YurtDisi_Sifir": "13.000 TL", "YurtDisi_IkinciEl": "10.000 TL" },
    "Redmi Note 15 Pro+": { "TR_Sifir": "30.000 TL", "TR_IkinciEl": "22.000 TL", "YurtDisi_Sifir": "13.000 TL", "YurtDisi_IkinciEl": "10.500 TL" },
    "Redmi Note 15 Pro": { "TR_Sifir": "25.000 TL", "TR_IkinciEl": "18.000 TL", "YurtDisi_Sifir": "11.000 TL", "YurtDisi_IkinciEl": "9.000 TL" },
    "Redmi Note 15": { "TR_Sifir": "18.000 TL", "TR_IkinciEl": "13.000 TL", "YurtDisi_Sifir": "8.000 TL", "YurtDisi_IkinciEl": "6.500 TL" },
    "Redmi Note 14 Pro+": { "TR_Sifir": "27.000 TL", "TR_IkinciEl": "20.000 TL", "YurtDisi_Sifir": "12.000 TL", "YurtDisi_IkinciEl": "9.500 TL" },
    "Redmi Note 14 Pro": { "TR_Sifir": "22.000 TL", "TR_IkinciEl": "16.000 TL", "YurtDisi_Sifir": "10.000 TL", "YurtDisi_IkinciEl": "8.000 TL" },
    "Redmi Note 14": { "TR_Sifir": "15.000 TL", "TR_IkinciEl": "11.000 TL", "YurtDisi_Sifir": "7.000 TL", "YurtDisi_IkinciEl": "5.500 TL" },
    "Redmi 14C": { "TR_Sifir": "9.000 TL", "TR_IkinciEl": "6.500 TL", "YurtDisi_Sifir": "4.500 TL", "YurtDisi_IkinciEl": "3.500 TL" },
    "Redmi Note 13 Pro+": { "TR_Sifir": "23.000 TL", "TR_IkinciEl": "16.000 TL", "YurtDisi_Sifir": "10.500 TL", "YurtDisi_IkinciEl": "8.500 TL" },
    "Redmi Note 13 Pro": { "TR_Sifir": "17.500 TL", "TR_IkinciEl": "12.000 TL", "YurtDisi_Sifir": "9.000 TL", "YurtDisi_IkinciEl": "7.000 TL" },
    "Redmi Note 13": { "TR_Sifir": "11.500 TL", "TR_IkinciEl": "8.500 TL", "YurtDisi_Sifir": "6.000 TL", "YurtDisi_IkinciEl": "4.500 TL" },
    "POCO F7 Pro": { "TR_Sifir": "45.000 TL", "TR_IkinciEl": "33.000 TL", "YurtDisi_Sifir": "20.000 TL", "YurtDisi_IkinciEl": "16.000 TL" },
    "POCO F7": { "TR_Sifir": "36.000 TL", "TR_IkinciEl": "26.000 TL", "YurtDisi_Sifir": "16.000 TL", "YurtDisi_IkinciEl": "13.000 TL" },
    "POCO X7 Pro": { "TR_Sifir": "23.500 TL", "TR_IkinciEl": "18.000 TL", "YurtDisi_Sifir": "10.500 TL", "YurtDisi_IkinciEl": "8.500 TL" },
    "POCO X7": { "TR_Sifir": "19.000 TL", "TR_IkinciEl": "14.000 TL", "YurtDisi_Sifir": "8.500 TL", "YurtDisi_IkinciEl": "7.000 TL" },
    "POCO F6 Pro": { "TR_Sifir": "35.000 TL", "TR_IkinciEl": "25.000 TL", "YurtDisi_Sifir": "16.000 TL", "YurtDisi_IkinciEl": "13.000 TL" },
    "POCO F6": { "TR_Sifir": "24.500 TL", "TR_IkinciEl": "18.000 TL", "YurtDisi_Sifir": "11.000 TL", "YurtDisi_IkinciEl": "9.000 TL" },
    "POCO X6 Pro": { "TR_Sifir": "27.000 TL", "TR_IkinciEl": "19.000 TL", "YurtDisi_Sifir": "10.500 TL", "YurtDisi_IkinciEl": "8.500 TL" },
    "POCO X6": { "TR_Sifir": "15.000 TL", "TR_IkinciEl": "11.000 TL", "YurtDisi_Sifir": "7.500 TL", "YurtDisi_IkinciEl": "6.000 TL" },
    "Xiaomi 13 Ultra": { "TR_IkinciEl": "40.000 TL" },
    "Xiaomi 13 Pro": { "TR_IkinciEl": "35.000 TL" },
    "Xiaomi 13 / 13T Pro": { "TR_IkinciEl": "25.000 TL - 28.000 TL" },
    "Xiaomi 12T Pro / 12 Pro": { "TR_IkinciEl": "18.000 TL - 20.000 TL" },
    "Xiaomi 11T Pro / Mi 11": { "TR_IkinciEl": "8.000 TL - 12.500 TL" },
    "Mi 10T Pro / Mi 10": { "TR_IkinciEl": "6.500 TL - 7.500 TL" },
    "Mi 9T Pro / Mi 9": { "TR_IkinciEl": "4.000 TL - 5.000 TL" },
    "Mi Note 10 / Note 10 Lite": { "TR_IkinciEl": "5.000 TL" },
    "Redmi Note 12 Pro+ / Pro": { "TR_IkinciEl": "10.000 TL - 13.000 TL" },
    "Redmi Note 11 Pro+ / Pro": { "TR_IkinciEl": "7.500 TL - 9.000 TL" },
    "Redmi Note 10 Pro / 10S": { "TR_IkinciEl": "4.500 TL - 6.000 TL" },
    "Redmi Note 9 Pro / 9S": { "TR_IkinciEl": "3.500 TL - 4.500 TL" },
    "Redmi Note 8 Pro / Note 8": { "TR_IkinciEl": "2.500 TL - 3.500 TL" },
    "Redmi Note 7": { "TR_IkinciEl": "2.000 TL" },
    "POCO F5 Pro / F5": { "TR_IkinciEl": "18.000 TL - 22.000 TL" },
    "POCO X5 Pro / X5": { "TR_IkinciEl": "9.000 TL - 12.000 TL" },
    "POCO F4 GT / F4": { "TR_IkinciEl": "11.000 TL" },
    "POCO X4 Pro / X4 GT": { "TR_IkinciEl": "8.500 TL" },
    "POCO X3 Pro / X3 NFC": { "TR_IkinciEl": "4.500 TL - 6.500 TL" },
    "POCO F3 / F2 Pro": { "TR_IkinciEl": "5.500 TL - 7.000 TL" }
};

app.get('/stats', async (req, res) => {
    // Eğer istatistikler henüz yüklenmediyse kısa bir süre beklemeyi dene
    const ready = await waitForStatsReady();

    if (!ready) {
        // Frontend'in eski verileri koruyabilmesi için initializing bayrağı gönder
        return res.json({
            initializing: true,
            totalScans: globalScans || 0,
            fraudCount: globalFrauds || 0,
            recentFeed: recentFeed || []
        });
    }

    res.json({
        initializing: false,
        totalScans: globalScans,
        fraudCount: globalFrauds,
        recentFeed: recentFeed
    });
});

app.post('/analyze', upload.array('images', 3), async (req, res) => {
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

        // YENİ PROMPT: Yapay Zekaya özel ayar çekildi
        const prompt = `Sen Türkiye'nin en iyi ve en kurt ikinci el telefon piyasası uzmanısın. Bugünün tarihi: ${bugun}. 
        Sana bir ilana ait 1'den fazla ekran görüntüsü göndermiş olabilirim. Lütfen gönderdiğim TÜM fotoğrafları inceleyerek, oradaki bilgileri (fiyat, açıklama, kapasite, garanti durumu vb.) birleştirip tam bir analiz yap.
        
        KULLANMAN GEREKEN GÜNCEL PİYASA REFERANS FİYATLARI (VERİTABANI):
        ${dbMetni}
        
        GÖREVİN (ÇOK KRİTİK VE DİKKATLİ OL):
        1. Ekran görüntülerindeki ilanın telefon modelini tam olarak anlamaya çalış. (Hafızası yazıyorsa onu da dikkate al).
        2. İlandaki ana fiyatı gör. DİKKAT: '23.00' veya '19:00' gibi saat ibarelerini veya taksitleri fiyat sanma.
        3. Cihazın durumunu tespit et (TR Garantili, Yurt Dışı, Sıfır, İkinci El vs.). "Direnç", "Server Kayıt", "Çift E-Sim" varsa Yurt Dışıdır.
        4. FİYAT ANALİZİ VE MANTIK: İlandaki cihazın istenen fiyatı ile veritabanındaki ortalama fiyatı karşılaştır. 
        
        !!! ÇOK ÖNEMLİ OLTALAMA (SCAM) KURALI !!!
        Eğer istenen fiyat, veritabanındaki fiyattan YÜKSEKSE veya piyasasına göre normalden biraz daha PAHALIYSA, bu genellikle oltalama (dolandırıcılık) DEĞİLDİR. Satıcı sadece tok satıcıdır veya kazık atmaya çalışıyordur, buna yüksek risk puanı VERME. 
        Oltalama (Scam/Dolandırıcılık) asıl fiyat piyasanın İNANILMAZ ALTINDA olduğunda (Örn: 60 binlik telefonu 25 bine satmak) olur. Bu ayrımı mükemmel yapmalısın!
        
        PUANLAMA:
        - 0-20 arası: DÜŞÜK RİSK (Fiyat normal veya normalden biraz pahalı, sorun yok).
        - 20-50 arası: ORTA RİSK.
        - 50-100 arası: YÜKSEK RİSK (Fiyat piyasanın şüpheli şekilde çok çok altında, bariz oltalama tuzağı).

        SADECE JSON FORMATINDA CEVAP VER, EK AÇIKLAMA YAZMA:
        {"score": 10, "reason": "Cihazın fiyatı piyasa ortalamasının biraz üzerinde, ancak şüpheli bir oltalama tuzağı görünmüyor.", "model": "iPhone 17 Pro Max"}`;

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

        const jsonMatch = responseText.match(/\{.*\}/s);
        const aiAnalysis = JSON.parse(jsonMatch[0]);

        globalScans++;
        if (aiAnalysis.score >= 75) globalFrauds++;

        if (statsCollection) {
            await statsCollection.updateOne(
                { id: "global" },
                { $set: { globalScans: globalScans, globalFrauds: globalFrauds } },
                { upsert: true }
            );
        }

        const newFeedItem = {
            model: aiAnalysis.model || "Bilinmeyen Cihaz",
            riskScore: aiAnalysis.score,
            imageUrl: finalImageUrl,
            time: Date.now()
        };

        if (feedCollection) {
            await feedCollection.insertOne(newFeedItem);
            recentFeed = await feedCollection.find().sort({ time: -1 }).limit(6).toArray();
        } else {
            recentFeed.unshift(newFeedItem);
            if (recentFeed.length > 6) recentFeed.pop();
        }

        res.json({
            success: true,
            riskScore: aiAnalysis.score,
            reason: aiAnalysis.reason,
            model: aiAnalysis.model || "Bilinmeyen Cihaz",
            totalScans: globalScans,
            fraudCount: globalFrauds
        });

    } catch (err) {
        console.error("KRİTİK HATA:", err.message);
        res.json({ error: err.message });
    }
});

// Sunucuyu başlatmadan önce MongoDB ve istatistiklerin tamamen yüklenmesini bekle
async function startServer() {
    await connectDB();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Piyasa.ai DEVASA (APPLE + SAMSUNG + XIAOMI) VERİTABANLI AKTİF! 🚀`);
    });
}

startServer();