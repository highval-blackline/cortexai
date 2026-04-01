// Vercel tetikleme satırı
let lastFeedJSON = ""; // Son gelen veriyi hafızada tutmak için
const frontEndDB = {
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
    "Samsung Galaxy S26 Ultra": { "TR_Sifir": "105.000 TL - 115.000 TL", "TR_IkinciEl": "95.000 TL - 100.000 TL", "YurtDisi_Sifir": "55.000 TL - 62.000 TL", "YurtDisi_IkinciEl": "48.000 TL - 53.000 TL" },
    "Samsung Galaxy S26+": { "TR_Sifir": "85.000 TL - 92.000 TL", "TR_IkinciEl": "75.000 TL - 80.000 TL", "YurtDisi_Sifir": "45.000 TL - 50.000 TL", "YurtDisi_IkinciEl": "38.000 TL - 42.000 TL" },
    "Samsung Galaxy S26": { "TR_Sifir": "72.000 TL - 78.000 TL", "TR_IkinciEl": "62.000 TL - 68.000 TL", "YurtDisi_Sifir": "38.000 TL - 42.000 TL", "YurtDisi_IkinciEl": "32.000 TL - 36.000 TL" },
    "Samsung Galaxy S25 Ultra": { "TR_Sifir": "90.000 TL - 98.000 TL", "TR_IkinciEl": "78.000 TL - 85.000 TL", "YurtDisi_Sifir": "45.000 TL - 50.000 TL", "YurtDisi_IkinciEl": "38.000 TL - 43.000 TL" },
    "Samsung Galaxy S25+": { "TR_Sifir": "70.000 TL - 76.000 TL", "TR_IkinciEl": "60.000 TL - 66.000 TL", "YurtDisi_Sifir": "36.000 TL - 40.000 TL", "YurtDisi_IkinciEl": "30.000 TL - 34.000 TL" },
    "Samsung Galaxy S25": { "TR_Sifir": "60.000 TL - 66.000 TL", "TR_IkinciEl": "50.000 TL - 56.000 TL", "YurtDisi_Sifir": "30.000 TL - 34.000 TL", "YurtDisi_IkinciEl": "26.000 TL - 29.000 TL" },
    "Samsung Galaxy S24 Ultra": { "TR_Sifir": "70.000 TL - 76.000 TL", "TR_IkinciEl": "58.000 TL - 65.000 TL", "YurtDisi_Sifir": "35.000 TL - 40.000 TL", "YurtDisi_IkinciEl": "28.000 TL - 33.000 TL" },
    "Samsung Galaxy S24+": { "TR_Sifir": "55.000 TL - 60.000 TL", "TR_IkinciEl": "44.000 TL - 50.000 TL", "YurtDisi_Sifir": "28.000 TL - 32.000 TL", "YurtDisi_IkinciEl": "22.000 TL - 26.000 TL" },
    "Samsung Galaxy S24": { "TR_Sifir": "48.000 TL - 53.000 TL", "TR_IkinciEl": "38.000 TL - 44.000 TL", "YurtDisi_Sifir": "24.000 TL - 28.000 TL", "YurtDisi_IkinciEl": "19.000 TL - 23.000 TL" },
    "Samsung Galaxy S24 FE": { "TR_Sifir": "34.000 TL - 38.000 TL", "TR_IkinciEl": "26.000 TL - 31.000 TL", "YurtDisi_Sifir": "18.000 TL - 22.000 TL", "YurtDisi_IkinciEl": "14.000 TL - 17.000 TL" },
    "Samsung Galaxy S23 Ultra": { "TR_IkinciEl": "45.000 TL - 52.000 TL" },
    "Samsung Galaxy S23+": { "TR_IkinciEl": "34.000 TL - 39.000 TL" },
    "Samsung Galaxy S23": { "TR_IkinciEl": "28.000 TL - 33.000 TL" },
    "Samsung Galaxy S23 FE": { "TR_IkinciEl": "20.000 TL - 24.000 TL" },
    "Samsung Galaxy S22 Ultra": { "TR_IkinciEl": "32.000 TL - 38.000 TL" },
    "Samsung Galaxy S22+": { "TR_IkinciEl": "22.000 TL - 26.000 TL" },
    "Samsung Galaxy S22": { "TR_IkinciEl": "17.000 TL - 21.000 TL" },
    "Samsung Galaxy S21 Ultra": { "TR_IkinciEl": "22.000 TL - 27.000 TL" },
    "Samsung Galaxy S21+": { "TR_IkinciEl": "15.000 TL - 18.000 TL" },
    "Samsung Galaxy S21": { "TR_IkinciEl": "12.000 TL - 15.000 TL" },
    "Samsung Galaxy S21 FE": { "TR_IkinciEl": "13.000 TL - 16.000 TL" },
    "Samsung Galaxy S20 Ultra": { "TR_IkinciEl": "15.000 TL - 18.000 TL" },
    "Samsung Galaxy S20+": { "TR_IkinciEl": "10.000 TL - 13.000 TL" },
    "Samsung Galaxy S20": { "TR_IkinciEl": "8.500 TL - 11.000 TL" },
    "Samsung Galaxy S20 FE": { "TR_IkinciEl": "9.000 TL - 12.000 TL" },
    "Samsung Galaxy S10+": { "TR_IkinciEl": "6.500 TL - 8.500 TL" },
    "Samsung Galaxy S10": { "TR_IkinciEl": "5.500 TL - 7.500 TL" },
    "Samsung Galaxy S10e": { "TR_IkinciEl": "4.500 TL - 6.000 TL" },
    "Samsung Galaxy S10 Lite": { "TR_IkinciEl": "5.000 TL - 7.000 TL" },
    "Samsung Galaxy S9+": { "TR_IkinciEl": "4.000 TL - 5.500 TL" },
    "Samsung Galaxy S9": { "TR_IkinciEl": "3.200 TL - 4.500 TL" },
    "Samsung Galaxy S8+": { "TR_IkinciEl": "2.800 TL - 3.800 TL" },
    "Samsung Galaxy S8": { "TR_IkinciEl": "2.200 TL - 3.200 TL" },
    "Samsung Galaxy S7 Edge": { "TR_IkinciEl": "1.500 TL - 2.200 TL" },
    "Samsung Galaxy S7": { "TR_IkinciEl": "1.000 TL - 1.600 TL" },
    "Samsung Galaxy Z Fold 7": { "TR_Sifir": "95.000 TL - 105.000 TL", "TR_IkinciEl": "80.000 TL - 88.000 TL", "YurtDisi_Sifir": "50.000 TL - 58.000 TL", "YurtDisi_IkinciEl": "42.000 TL - 48.000 TL" },
    "Samsung Galaxy Z Flip 7": { "TR_Sifir": "60.000 TL - 68.000 TL", "TR_IkinciEl": "48.000 TL - 55.000 TL", "YurtDisi_Sifir": "35.000 TL - 40.000 TL", "YurtDisi_IkinciEl": "28.000 TL - 32.000 TL" },
    "Samsung Galaxy Z Fold Special Edition": { "TR_Sifir": "Özel İthalat (Ort: 110.000 TL)", "TR_IkinciEl": "85.000 TL - 95.000 TL", "YurtDisi_Sifir": "60.000 TL - 68.000 TL", "YurtDisi_IkinciEl": "50.000 TL - 55.000 TL" },
    "Samsung Galaxy Z Fold 6": { "TR_Sifir": "80.000 TL - 88.000 TL", "TR_IkinciEl": "65.000 TL - 72.000 TL", "YurtDisi_Sifir": "42.000 TL - 48.000 TL", "YurtDisi_IkinciEl": "34.000 TL - 39.000 TL" },
    "Samsung Galaxy Z Flip 6": { "TR_Sifir": "52.000 TL - 58.000 TL", "TR_IkinciEl": "40.000 TL - 46.000 TL", "YurtDisi_Sifir": "28.000 TL - 33.000 TL", "YurtDisi_IkinciEl": "22.000 TL - 26.000 TL" },
    "Samsung Galaxy Z Fold 5": { "TR_IkinciEl": "45.000 TL - 52.000 TL" },
    "Samsung Galaxy Z Flip 5": { "TR_IkinciEl": "28.000 TL - 34.000 TL" },
    "Samsung Galaxy Z Fold 4": { "TR_IkinciEl": "30.000 TL - 36.000 TL" },
    "Samsung Galaxy Z Flip 4": { "TR_IkinciEl": "18.000 TL - 23.000 TL" },
    "Samsung Galaxy Z Fold 3": { "TR_IkinciEl": "20.000 TL - 25.000 TL" },
    "Samsung Galaxy Z Flip 3": { "TR_IkinciEl": "12.000 TL - 16.000 TL" },
    "Samsung Galaxy Z Fold 2": { "TR_IkinciEl": "14.000 TL - 18.000 TL" },
    "Samsung Galaxy Z Flip": { "TR_IkinciEl": "8.000 TL - 11.000 TL" },
    "Samsung Galaxy Fold": { "TR_IkinciEl": "9.000 TL - 13.000 TL" },
    "Samsung Galaxy Note 20 Ultra": { "TR_IkinciEl": "20.000 TL - 25.000 TL" },
    "Samsung Galaxy Note 20": { "TR_IkinciEl": "15.000 TL - 19.000 TL" },
    "Samsung Galaxy Note 10+": { "TR_IkinciEl": "11.000 TL - 14.000 TL" },
    "Samsung Galaxy Note 10": { "TR_IkinciEl": "8.500 TL - 11.000 TL" },
    "Samsung Galaxy Note 10 Lite": { "TR_IkinciEl": "7.500 TL - 9.500 TL" },
    "Samsung Galaxy Note 9": { "TR_IkinciEl": "5.500 TL - 7.500 TL" },
    "Samsung Galaxy Note 8": { "TR_IkinciEl": "4.000 TL - 5.500 TL" },
    "Samsung Galaxy Note FE": { "TR_IkinciEl": "2.500 TL - 3.500 TL" },
    "Samsung Galaxy Note 7": { "TR_IkinciEl": "Koleksiyonluk / Riskli Cihaz" },
    "Samsung Galaxy A56": { "TR_Sifir": "30.000 TL - 34.000 TL", "TR_IkinciEl": "24.000 TL - 28.000 TL", "YurtDisi_Sifir": "15.000 TL - 18.000 TL", "YurtDisi_IkinciEl": "11.000 TL - 14.000 TL" },
    "Samsung Galaxy A36": { "TR_Sifir": "24.000 TL - 28.000 TL", "TR_IkinciEl": "19.000 TL - 23.000 TL", "YurtDisi_Sifir": "12.000 TL - 15.000 TL", "YurtDisi_IkinciEl": "9.000 TL - 11.000 TL" },
    "Samsung Galaxy A26": { "TR_Sifir": "18.000 TL - 22.000 TL", "TR_IkinciEl": "14.000 TL - 17.000 TL", "YurtDisi_Sifir": "9.500 TL - 12.000 TL", "YurtDisi_IkinciEl": "7.500 TL - 9.000 TL" },
    "Samsung Galaxy A16": { "TR_Sifir": "13.000 TL - 16.000 TL", "TR_IkinciEl": "10.000 TL - 13.000 TL", "YurtDisi_Sifir": "7.000 TL - 9.000 TL", "YurtDisi_IkinciEl": "5.500 TL - 7.000 TL" },
    "Samsung Galaxy A55 5G": { "TR_Sifir": "22.000 TL - 25.000 TL", "TR_IkinciEl": "17.000 TL - 21.000 TL", "YurtDisi_Sifir": "11.000 TL - 14.000 TL", "YurtDisi_IkinciEl": "8.500 TL - 10.500 TL" },
    "Samsung Galaxy A35 5G": { "TR_Sifir": "17.000 TL - 20.000 TL", "TR_IkinciEl": "13.000 TL - 16.000 TL", "YurtDisi_Sifir": "9.000 TL - 11.000 TL", "YurtDisi_IkinciEl": "7.000 TL - 8.500 TL" },
    "Samsung Galaxy A25 5G": { "TR_Sifir": "13.000 TL - 16.000 TL", "TR_IkinciEl": "10.000 TL - 13.000 TL", "YurtDisi_Sifir": "7.500 TL - 9.500 TL", "YurtDisi_IkinciEl": "5.500 TL - 7.000 TL" },
    "Samsung Galaxy A15": { "TR_Sifir": "10.000 TL - 12.000 TL", "TR_IkinciEl": "7.500 TL - 9.500 TL", "YurtDisi_Sifir": "5.500 TL - 7.000 TL", "YurtDisi_IkinciEl": "4.000 TL - 5.500 TL" },
    "Samsung Galaxy A05s": { "TR_Sifir": "8.500 TL - 10.500 TL", "TR_IkinciEl": "6.000 TL - 8.000 TL", "YurtDisi_Sifir": "4.500 TL - 6.000 TL", "YurtDisi_IkinciEl": "3.500 TL - 4.500 TL" },
    "Samsung Galaxy A05": { "TR_Sifir": "7.000 TL - 8.500 TL", "TR_IkinciEl": "5.000 TL - 6.500 TL", "YurtDisi_Sifir": "4.000 TL - 5.000 TL", "YurtDisi_IkinciEl": "3.000 TL - 4.000 TL" },
    "Samsung Galaxy A54 5G": { "TR_IkinciEl": "13.000 TL - 16.000 TL" },
    "Samsung Galaxy A34 5G": { "TR_IkinciEl": "10.000 TL - 13.000 TL" },
    "Samsung Galaxy A24": { "TR_IkinciEl": "8.000 TL - 10.000 TL" },
    "Samsung Galaxy A14": { "TR_IkinciEl": "6.000 TL - 8.000 TL" },
    "Samsung Galaxy A04s": { "TR_IkinciEl": "4.500 TL - 6.000 TL" },
    "Samsung Galaxy A04e": { "TR_IkinciEl": "3.500 TL - 5.000 TL" },
    "Samsung Galaxy A04": { "TR_IkinciEl": "4.000 TL - 5.500 TL" },
    "Samsung Galaxy A73 5G": { "TR_IkinciEl": "14.000 TL - 17.000 TL" },
    "Samsung Galaxy A53 5G": { "TR_IkinciEl": "10.000 TL - 13.000 TL" },
    "Samsung Galaxy A33 5G": { "TR_IkinciEl": "8.000 TL - 10.500 TL" },
    "Samsung Galaxy A23": { "TR_IkinciEl": "6.500 TL - 8.500 TL" },
    "Samsung Galaxy A13": { "TR_IkinciEl": "5.000 TL - 6.500 TL" },
    "Samsung Galaxy A03s": { "TR_IkinciEl": "3.500 TL - 4.500 TL" },
    "Samsung Galaxy A03": { "TR_IkinciEl": "3.000 TL - 4.200 TL" },
    "Samsung Galaxy A03 Core": { "TR_IkinciEl": "2.500 TL - 3.500 TL" },
    "Samsung Galaxy A72": { "TR_IkinciEl": "9.000 TL - 12.000 TL" },
    "Samsung Galaxy A52s 5G": { "TR_IkinciEl": "8.500 TL - 11.500 TL" },
    "Samsung Galaxy A52": { "TR_IkinciEl": "7.500 TL - 9.500 TL" },
    "Samsung Galaxy A32": { "TR_IkinciEl": "6.000 TL - 8.000 TL" },
    "Samsung Galaxy A22": { "TR_IkinciEl": "5.500 TL - 7.500 TL" },
    "Samsung Galaxy A12": { "TR_IkinciEl": "4.500 TL - 6.000 TL" },
    "Samsung Galaxy A02s": { "TR_IkinciEl": "3.200 TL - 4.500 TL" },
    "Samsung Galaxy A02": { "TR_IkinciEl": "2.800 TL - 3.800 TL" },
    "Samsung Galaxy A71": { "TR_IkinciEl": "7.000 TL - 9.000 TL" },
    "Samsung Galaxy A51": { "TR_IkinciEl": "5.500 TL - 7.500 TL" },
    "Samsung Galaxy A31": { "TR_IkinciEl": "4.500 TL - 6.000 TL" },
    "Samsung Galaxy A21s": { "TR_IkinciEl": "4.000 TL - 5.500 TL" },
    "Samsung Galaxy A11": { "TR_IkinciEl": "3.000 TL - 4.200 TL" },
    "Samsung Galaxy A01": { "TR_IkinciEl": "2.000 TL - 3.000 TL" },
    "Samsung Galaxy A01 Core": { "TR_IkinciEl": "1.500 TL - 2.500 TL" },
    "Samsung Galaxy A80": { "TR_IkinciEl": "6.000 TL - 8.000 TL" },
    "Samsung Galaxy A70": { "TR_IkinciEl": "4.500 TL - 6.500 TL" },
    "Samsung Galaxy A50": { "TR_IkinciEl": "3.500 TL - 5.000 TL" },
    "Samsung Galaxy A40": { "TR_IkinciEl": "3.000 TL - 4.200 TL" },
    "Samsung Galaxy A30s": { "TR_IkinciEl": "3.200 TL - 4.500 TL" },
    "Samsung Galaxy A30": { "TR_IkinciEl": "2.800 TL - 4.000 TL" },
    "Samsung Galaxy A20s": { "TR_IkinciEl": "2.600 TL - 3.800 TL" },
    "Samsung Galaxy A20": { "TR_IkinciEl": "2.400 TL - 3.500 TL" },
    "Samsung Galaxy A10s": { "TR_IkinciEl": "2.200 TL - 3.200 TL" },
    "Samsung Galaxy A10": { "TR_IkinciEl": "2.000 TL - 2.800 TL" },
    "Samsung Galaxy A9 (2018)": { "TR_IkinciEl": "3.000 TL - 4.500 TL" },
    "Samsung Galaxy A8+ (2018)": { "TR_IkinciEl": "2.500 TL - 3.500 TL" },
    "Samsung Galaxy A8 (2018)": { "TR_IkinciEl": "2.200 TL - 3.200 TL" },
    "Samsung Galaxy A7 (2018)": { "TR_IkinciEl": "2.000 TL - 3.000 TL" },
    "Samsung Galaxy A6+": { "TR_IkinciEl": "1.800 TL - 2.600 TL" },
    "Samsung Galaxy A6": { "TR_IkinciEl": "1.500 TL - 2.200 TL" },
    "Samsung Galaxy A7 (2017)": { "TR_IkinciEl": "1.200 TL - 1.800 TL" },
    "Samsung Galaxy A5 (2017)": { "TR_IkinciEl": "1.000 TL - 1.500 TL" },
    "Samsung Galaxy A3 (2017)": { "TR_IkinciEl": "800 TL - 1.200 TL" },
    "Samsung Galaxy A7 (2016)": { "TR_IkinciEl": "800 TL - 1.200 TL" },
    "Samsung Galaxy A5 (2016)": { "TR_IkinciEl": "700 TL - 1.000 TL" },
    "Samsung Galaxy A3 (2016)": { "TR_IkinciEl": "500 TL - 800 TL" },
    "Samsung Galaxy XCover 7": { "TR_Sifir": "18.000 TL - 22.000 TL", "TR_IkinciEl": "14.000 TL - 17.000 TL", "YurtDisi_Sifir": "10.000 TL - 13.000 TL", "YurtDisi_IkinciEl": "7.500 TL - 9.500 TL" },
    "Samsung Galaxy XCover 5": { "TR_IkinciEl": "4.000 TL - 6.000 TL" },
    "Samsung Galaxy XCover 4": { "TR_IkinciEl": "1.500 TL - 2.500 TL" },
    "Samsung Galaxy C9 Pro": { "TR_IkinciEl": "1.800 TL - 2.600 TL" },
    "Samsung Galaxy C7": { "TR_IkinciEl": "1.200 TL - 1.800 TL" },
    "Samsung Galaxy C5": { "TR_IkinciEl": "900 TL - 1.400 TL" },

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

function showImage(url) {
    if (!url) return alert('Bu analizin resmi sisteme kaydedilmemiş veya gizli.');
    document.getElementById('modalImage').src = url;
    document.getElementById('imageModal').style.display = 'flex';
}

document.addEventListener("DOMContentLoaded", function () {
    // Eğer URL'de bir ID varsa (paylaşılan linke tıklandıysa) direkt o analizi aç
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('id');
    if (sharedId) {
        // Sahtekarlık Analizi sekmesine geç
        const fraudTab = document.querySelector('.nav-item[onclick*="fraud"]');
        if (fraudTab) switchTab('fraud', fraudTab);
        loadSharedAnalysis(sharedId);
    }
    const searchInput = document.getElementById('modelSearchInput');
    const dropdownList = document.getElementById('modelDropdownList');
    const hiddenSelect = document.getElementById('modelSelect');

    function renderDropdown(filterText = "") {
        dropdownList.innerHTML = "";
        const models = Object.keys(frontEndDB);
        const filteredModels = models.filter(model => model.toLowerCase().includes(filterText.toLowerCase()));

        if (filteredModels.length === 0) {
            dropdownList.innerHTML = "<div style='padding: 10px 12px; color: var(--text-muted); font-size: 13px;'>Sonuç bulunamadı</div>";
            return;
        }

        filteredModels.forEach(model => {
            let div = document.createElement('div');
            div.className = 'dropdown-item'; div.innerText = model;
            div.onclick = function () {
                searchInput.value = model; hiddenSelect.value = model;
                dropdownList.style.display = 'none'; calculatePrice();
            };
            dropdownList.appendChild(div);
        });
    }

    searchInput.addEventListener('focus', () => { renderDropdown(searchInput.value); dropdownList.style.display = 'block'; });
    searchInput.addEventListener('input', (e) => { hiddenSelect.value = ""; renderDropdown(e.target.value); dropdownList.style.display = 'block'; });
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdownList.contains(e.target)) {
            dropdownList.style.display = 'none';
            if (!hiddenSelect.value) searchInput.value = "";
        }
    });

    const savedUser = localStorage.getItem('userData');
    if (savedUser) {
        const userData = JSON.parse(savedUser);
        window.currentUserEmail = userData.email;
        document.getElementById('userSection').innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; padding: 5px;">
            <img src="${userData.picture}" style="width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; flex-direction: column; flex-grow: 1;">
                <span style="font-size: 13px; font-weight: 600; color: white;">${userData.name}</span>
                <span style="font-size: 10px; color: var(--text-muted);">Aktif Kullanıcı</span>
            </div>
            <button onclick="logout()" class="logout-btn" title="Çıkış Yap">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
        </div>
    `;
    } else {
        // YENİ EKLENEN KISIM: Sadece giriş YAPMAMIŞ kişilere Google Login göster
        setTimeout(() => {
            if (window.google) {
                google.accounts.id.initialize({
                    client_id: "104508083781-2ib50lt8k0ud027375q9k3aja7gd8403.apps.googleusercontent.com",
                    callback: handleCredentialResponse
                });
                google.accounts.id.renderButton(
                    document.getElementById("googleButtonContainer"),
                    { theme: "filled_black", size: "large", type: "standard" }
                );
                google.accounts.id.prompt(); // Sağ üstteki popup'ı SADECE bunlara çıkar
            }
        }, 800); // Sistemin tam yüklenmesi için ufak bir bekleme süresi
    }

    fetchGlobalStats();
    setInterval(fetchGlobalStats, 5000);
});

function calculatePrice() {
    const model = document.getElementById('modelSelect').value;
    const origin = document.getElementById('originSelect').value; // Hata düzeltildi.
    const display = document.getElementById('priceDisplay');

    if (!model) return;
    const price = frontEndDB[model][origin];

    if (price) {
        display.innerHTML = `${price} <button onclick="openAlarmModal('${model}')" style="margin-left: 15px; background: var(--bg-panel); border: 1px solid var(--border-focus); color: var(--text-main); padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;"><i class="fa-solid fa-bell" style="color: var(--brand-accent);"></i> Alarm Kur</button>`;
        display.style.color = "var(--brand-accent)";
    }
    else { display.innerHTML = "<span style='font-size:13px; color:var(--risk-high);'>Bu cihazın bu kategoride güncel piyasası yoktur.</span>"; }
}

async function fetchGlobalStats() {
    try {
        const res = await fetch('https://piyasa-ai.onrender.com/stats');
        const data = await res.json();
        document.getElementById('totalListings').innerText = data.totalScans;
        document.getElementById('fraudCount').innerText = data.fraudCount;

        const feedList = document.getElementById('liveFeedList');
        const tableBody = document.getElementById('tableBody');

        const feedLoader = document.getElementById('feedLoading');
        if (feedLoader) feedLoader.style.display = 'none';
        if (feedList) feedList.style.display = 'flex';

        if (data.recentFeed && data.recentFeed.length > 0) {
            // YENİ: Eğer gelen veri eskisiyle aynıysa listeyi yenileme (Animasyon bozulmasın diye)
            const currentFeedJSON = JSON.stringify(data.recentFeed);
            if (currentFeedJSON === lastFeedJSON) return; 
            lastFeedJSON = currentFeedJSON;

            feedList.innerHTML = '';
            if (tableBody) tableBody.innerHTML = '';

            data.recentFeed.forEach(item => {
                const timeDiff = Math.floor((Date.now() - item.time) / 60000);
                const timeText = timeDiff === 0 ? "Şimdi" : timeDiff + " dk önce";
                const isHighRisk = item.riskScore >= 50;
                const isMedRisk = item.riskScore >= 20 && item.riskScore < 50;
                const borderColor = isHighRisk ? 'var(--risk-high)' : (isMedRisk ? 'var(--risk-med)' : 'var(--risk-low)');

                // 1. PİYASA ÖZETİ (Canlı Akış) KARTI
                feedList.innerHTML += `
                    <div class="feed-item" onclick="showImage('${item.imageUrl}')" style="background: var(--bg-absolute); padding: 12px; border-radius: 8px; border-left: 4px solid ${borderColor}; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                        <div><span style="font-weight: 600;">${item.model}</span> <span style="font-size: 12px; color: var(--text-muted); margin-left: 10px;">${timeText}</span></div>
                        <div style="color: ${borderColor}; font-weight: 600;">%${item.riskScore} Risk <i class="fa-solid fa-camera" style="margin-left:8px; color:var(--text-muted);"></i></div>
                    </div>
                `;

                // 2. CANLI RADAR İÇİN TABLO SATIRI
                // 1. Temel Veri Çekme (Hatalara karşı korumalı)
                let ilanFiyati = item.fiyat || "Bilinmiyor";
                let piyasaDegeri = "Bulunamadı";
                let durumEtiketi = `<span class="badge" style="background: #374151; color: white; padding: 4px 8px; border-radius: 4px;">İnceleniyor</span>`;

                // 2. Veritabanı (frontEndDB) Kontrolü
                if (item.model && frontEndDB[item.model]) {
                    const modelData = frontEndDB[item.model];

                    // Durum bilgisi varsa onu, yoksa varsayılan olarak ikinci eli al
                    if (item.condition && modelData[item.condition]) {
                        piyasaDegeri = modelData[item.condition];
                    } else if (modelData["TR_IkinciEl"]) {
                        piyasaDegeri = modelData["TR_IkinciEl"];
                    }
                }

                // 3. Matematiksel Yüzde Hesaplama (Kâr/Zarar)
                let ilanSayi = parseInt(String(ilanFiyati).replace(/[^0-9]/g, '')) || 0;
                let piyasaSayilari = String(piyasaDegeri).split('-').map(val => parseInt(val.replace(/[^0-9]/g, '')) || 0);
                let piyasaOrtalama = 0;

                if (piyasaSayilari.length === 2 && piyasaSayilari[0] > 0 && piyasaSayilari[1] > 0) {
                    piyasaOrtalama = (piyasaSayilari[0] + piyasaSayilari[1]) / 2;
                } else if (piyasaSayilari.length > 0) {
                    piyasaOrtalama = piyasaSayilari[0];
                }

                // Risk Kontrolü (Değişken çakışmasını önlemek için doğrudan skorları kontrol ediyoruz)
                if (item.riskScore >= 75) {
                    // 1. Öncelik: Kritik Risk - KOYU KIRMIZI ZEMİN / BEYAZ YAZI
                    durumEtiketi = `<span class="badge" style="background: #C92A2A; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600;">Dolandırıcı Riski!</span>`;
                } else if (item.riskScore >= 40 && item.riskScore < 75) {
                    // 2. Öncelik: Orta/Yüksek Risk - KOYU TURUNCU ZEMİN / BEYAZ YAZI
                    durumEtiketi = `<span class="badge" style="background: #D97706; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600;">Şüpheli İlan (%${item.riskScore} Risk)</span>`;
                } else if (ilanSayi > 0 && piyasaOrtalama > 0) {
                    // 3. Öncelik: Risk düşükse fiyat analizi yap
                    let karYuzdesi = ((piyasaOrtalama - ilanSayi) / piyasaOrtalama) * 100;

                    if (karYuzdesi >= 15) {
                        // ÇOK UCUZ - KOYU MAVİ ZEMİN / BEYAZ YAZI
                        durumEtiketi = `<span class="badge" style="background: #0056B3; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600;">FIRSAT 🚀</span>`;
                    } else if (karYuzdesi >= 10 && karYuzdesi < 15) {
                        // UCUZ - KOYU YEŞİL ZEMİN / BEYAZ YAZI (Alt sınır %5'ten %10'a çıkarıldı)
                        durumEtiketi = `<span class="badge" style="background: #248A3D; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600;">Uygun Fiyat</span>`;
                    } else if (karYuzdesi > -10 && karYuzdesi < 10) {
                        // NORMAL - KOYU GRİ ZEMİN / BEYAZ YAZI (Nötr alanı genişletildi)
                        durumEtiketi = `<span class="badge" style="background: #636366; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600;">Nötr (Değerinde)</span>`;
                    } else if (karYuzdesi <= -10 && karYuzdesi > -15) {
                        // BİRAZ PAHALI - KOYU TURUNCU ZEMİN / BEYAZ YAZI
                        durumEtiketi = `<span class="badge" style="background: #D97706; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600;">Biraz Pahalı</span>`;
                    } else if (karYuzdesi <= -15) {
                        // ÇOK PAHALI - KOYU KIRMIZI ZEMİN / BEYAZ YAZI
                        durumEtiketi = `<span class="badge" style="background: #C92A2A; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600;">Çok Pahalı</span>`;
                    }
                } else {
                    // VERİ YOK - SİYAHIMSI GRİ ZEMİN / BEYAZ YAZI
                    durumEtiketi = `<span class="badge" style="background: #3A3A3C; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600;">Fiyat Analizi Yapılamadı</span>`;
                }

                // 4. Tabloya Yazdırma
                if (tableBody) {
                    let durumMetni = "";
                    if (item.condition === 'TR_Sifir') durumMetni = " (Sıfır)";
                    else if (item.condition === 'TR_IkinciEl') durumMetni = " (İkinci El)";

                    tableBody.innerHTML += `
        <tr onclick="showImage('${item.imageUrl}')" style="cursor:pointer;" class="feed-item">
            <td>${item.model}${durumMetni}</td>
            <td style="color: var(--brand-accent); font-weight: 600;">${ilanFiyati}</td>
            <td>${piyasaDegeri}</td>
            <td>${durumEtiketi}</td>
        </tr>
    `;
                }
            });
        }
    } catch (e) { console.log("Sayaçlara ulaşılamadı."); }
}

function switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    let target = element.closest('.nav-item');
    if (target) target.classList.add('active');

    // Yeni eklenen kısım: Sekme 'alarms' ise verileri yükle
    if (tabId === 'alarms') {
        loadMyAlarms();
    }
}

function runGlobalScan() {
    const icon = document.getElementById('scanIcon'); icon.classList.add('fa-spin');
    setTimeout(() => { icon.classList.remove('fa-spin'); alert('Ağ taraması tamamlandı, sistem güncel!'); }, 1000);
}

let pastedFiles = [];

document.addEventListener('paste', function (e) {
    if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
            if (e.clipboardData.items[i].type.indexOf("image") !== -1) {
                if (pastedFiles.length >= 3) {
                    alert("Panodan en fazla 3 fotoğraf yapıştırabilirsiniz!");
                    return;
                }
                pastedFiles.push(e.clipboardData.items[i].getAsFile());
                const display = document.getElementById('fileNameDisplay');
                display.innerText = "📋 " + pastedFiles.length + " Fotoğraf Yapıştırıldı";
                display.style.color = "white";
                document.getElementById('imageUrlInput').value = "";
                document.getElementById('errorMsg').style.display = 'none';
            }
        }
    }
});

function clearFileInput() { pastedFiles = []; document.getElementById('imageInput').value = ""; document.getElementById('fileNameDisplay').innerText = "📸 1-3 Arası Fotoğraf Seç (Tüm Detaylar)"; document.getElementById('fileNameDisplay').style.color = "var(--text-muted)"; document.getElementById('errorMsg').style.display = 'none'; }

function updateFileName() {
    pastedFiles = [];
    document.getElementById('imageUrlInput').value = "";
    const input = document.getElementById('imageInput');
    const display = document.getElementById('fileNameDisplay');

    if (input.files && input.files.length > 0) {
        if (input.files.length > 3) {
            alert("Yapay zeka analizi için en fazla 3 fotoğraf seçebilirsiniz!");
            input.value = "";
            display.innerText = "📸 1-3 Arası Fotoğraf Seç (Tüm Detaylar)";
            display.style.color = "var(--text-muted)";
            return;
        }
        display.innerText = "📁 " + input.files.length + " fotoğraf seçildi";
        display.style.color = "white";
        document.getElementById('errorMsg').style.display = 'none';
    }
}

async function startAnalysis() {
    const fileInput = document.getElementById('imageInput');
    const urlInput = document.getElementById('imageUrlInput').value.trim();
    const errorMsg = document.getElementById('errorMsg');

    let filesToProcess = [];
    if (pastedFiles.length > 0) {
        filesToProcess = pastedFiles;
    } else if (fileInput.files && fileInput.files.length > 0) {
        filesToProcess = Array.from(fileInput.files);
    }

    if (filesToProcess.length === 0 && urlInput === '') { errorMsg.style.display = 'block'; return; }
    errorMsg.style.display = 'none';
    const box = document.getElementById('dropZone');

    box.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px 0;">
            <div style="width: 36px; height: 36px; border: 2px solid rgba(255, 255, 255, 0.08); border-top: 2px solid #ffffff; border-radius: 50%; animation: spinApple 0.8s linear infinite; margin-bottom: 24px; filter: drop-shadow(0 0 6px rgba(255,255,255,0.2));"></div>
            <h3 style="color: white; font-weight: 500; font-size: 15px; letter-spacing: 0.5px; animation: pulseApple 2s infinite;">Yapay Zeka Analiz Ediyor...</h3>
            <p style="color: rgba(255, 255, 255, 0.5); font-size: 13px; margin-top: 8px;">${filesToProcess.length > 0 ? filesToProcess.length + ' fotoğraf işleniyor ve birleştiriliyor...' : 'Link indiriliyor...'}</p>
        </div>
    `;

    const formData = new FormData();

    if (filesToProcess.length > 0) {
        for (let file of filesToProcess) {
            if (file.type.startsWith('image/')) {
                try {
                    let compressed = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1200, useWebWorker: true });
                    formData.append('images', compressed);
                }
                catch (error) {
                    console.error("Sıkıştırma atlandı:", error);
                    formData.append('images', file);
                }
            }
        }
    } else if (urlInput) {
        formData.append('imageUrl', urlInput);
    }

    try {
        const response = await fetch(`https://piyasa-ai.onrender.com/analyze`, { method: 'POST', body: formData });
        const data = await response.json();

        if (data.error) { alert("Analiz Hatası: " + data.error); resetAnalysis(); return; }

        // YENİ: Başarılı analiz sonrası URL'ye ID ekle (Sayfa yenilenmeden)
        if (data.analysisId) {
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?id=' + data.analysisId;
            window.history.pushState({ path: newUrl }, '', newUrl);
            document.getElementById('shareUrlInput').value = newUrl;
            document.getElementById('shareBox').style.display = 'block';
        }

        document.getElementById('analysisResult').style.display = 'block';
        box.style.display = 'none';
        document.getElementById('scannedUrl').innerText = urlInput || filesToProcess.length + " Adet İlan Görseli";

        const scoreBox = document.getElementById('scoreResult');
        scoreBox.innerText = "%" + data.riskScore + " Risk";
        scoreBox.style.color = data.riskScore > 50 ? 'var(--risk-high)' : (data.riskScore > 0 ? 'var(--risk-med)' : 'var(--risk-low)');
        document.getElementById('keywordResult').innerText = data.reason || "Şüpheli bir duruma rastlanmadı.";

        const decisionBox = document.getElementById('aiDecision');
        if (data.riskScore >= 50) {
            decisionBox.style.borderLeftColor = 'var(--risk-high)'; decisionBox.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';
            decisionBox.innerHTML = `<div style="margin-bottom: 10px;"><strong>DİKKAT YÜKSEK RİSK:</strong> Sistem görselde riskli detaylar ve oltalama şüphesi tespit etti.</div><div style="font-size: 13px; color: #e0e0e0; border-top: 1px solid rgba(255, 68, 68, 0.3); padding-top: 10px;"><i class="fa-solid fa-triangle-exclamation" style="color: var(--risk-high); margin-right: 5px;"></i> <b>Tavsiye:</b> İmkanınız varsa satıcıyla mutlaka <b>yüz yüze</b> görüşün ve cihazı elden teslim alın. Eğer uzaktaysanız alışverişi sadece <b>'Param Güvende'</b> ile gerçekleştirmek istediğinizi söyleyin. Satıcı bunu reddedip havale/EFT talep ediyorsa işlemi derhal iptal edin ve uzaklaşın, %99 dolandırıcıdır!</div>`;
        } else if (data.riskScore >= 20) {
            decisionBox.style.borderLeftColor = 'var(--risk-med)'; decisionBox.style.backgroundColor = 'rgba(255, 187, 51, 0.1)';
            decisionBox.innerHTML = `<div style="margin-bottom: 10px;"><strong>ORTA RİSK:</strong> İlanda bazı şüpheli izler veya tutarsızlıklar bulunuyor.</div><div style="font-size: 13px; color: #e0e0e0; border-top: 1px solid rgba(255, 187, 51, 0.3); padding-top: 10px;"><i class="fa-solid fa-circle-exclamation" style="color: var(--risk-med); margin-right: 5px;"></i> <b>Tavsiye:</b> Satıcıyla yüz yüze görüşmeden veya Sahibinden 'Param Güvende' sistemini kullanmadan <b>kesinlikle ödeme yapmayın.</b> Satıcı güvenli ödemeye yanaşmıyorsa riske girmeyin.</div>`;
        } else {
            decisionBox.style.borderLeftColor = 'var(--risk-low)'; decisionBox.style.backgroundColor = 'rgba(0, 200, 81, 0.1)';
            decisionBox.innerHTML = `<div style="margin-bottom: 10px;"><strong>GÜVENLİ GÖRÜNÜYOR:</strong> Görseldeki ilan detaylarında bilinen bir oltalama taktiğine rastlanmadı.</div><div style="font-size: 13px; color: #e0e0e0; border-top: 1px solid rgba(0, 200, 81, 0.3); padding-top: 10px;"><i class="fa-solid fa-shield-check" style="color: var(--risk-low); margin-right: 5px;"></i> <b>Tavsiye:</b> İlan temiz görünse de internet alışverişlerinde tedbiri elden bırakmayın ve her zaman platformun kendi güvenli ödeme yöntemlerini tercih edin.</div>`;
        }

        // YANLIŞ YERDEN KESİP BURAYA YAPIŞTIRDIK
        document.getElementById('communityFeedback').style.display = 'block';
        window.lastAnalyzedScore = data.riskScore;

        fetchGlobalStats();

    } catch (e) { alert("Sunucuya Bağlanılamadı! Lütfen internet bağlantınızı kontrol edin."); resetAnalysis(); }
}

function resetAnalysis() {
    pastedFiles = [];
    document.getElementById('analysisResult').style.display = 'none';
    document.getElementById('communityFeedback').style.display = 'none'; // BUNU YENİ EKLEDİK
    const box = document.getElementById('dropZone');
    box.style.display = 'block';

    box.innerHTML = `
        <i class="fa-solid fa-images"></i>
        <h3>Çoklu Görsel Analizi</h3>
        <p style="font-size: 12px; margin-bottom: 10px;">(Ekran görüntülerini kopyalayıp sırayla <b>Ctrl+V</b> yapabilirsiniz)</p>
        <div class="input-group">
            <div style="display: flex; gap: 10px; width: 80%;">
                <input type="file" id="imageInput" accept="image/*" multiple style="display: none;" onchange="updateFileName()">
                <label for="imageInput" class="scan-input" id="fileNameDisplay" style="cursor: pointer; text-align: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin: 0;">📸 1-3 Arası Fotoğraf Seç (Tüm Detaylar)</label>
            </div>
            <p style="font-size: 12px; margin: 5px 0;">veya</p>
            <div style="display: flex; gap: 10px; width: 80%;">
                <input type="text" id="imageUrlInput" class="scan-input" placeholder="🔗 Resim Linki Yapıştır..." autocomplete="off" oninput="clearFileInput()">
            </div>
            <button class="btn-outline" style="background: white; color: black; min-width: 150px; margin-top: 10px; padding: 12px;" onclick="startAnalysis()">Yapay Zekaya Gönder</button>
        </div>
        <div class="info-warning">
            <b>ÖNEMLİ:</b> Yapay zekanın kusursuz analiz yapabilmesi için sadece ilk fotoğrafı değil; ilanın <b>Hafıza Kapasitesi, Garanti Durumu, Cihaz Durumu ve Açıklama</b> kısımlarını gösteren alt bölümlerini de ekran görüntüsü alıp (en fazla 3 adet) yükleyiniz. Fiyatlar bu detaylara göre devasa farklar gösterir.
        </div>
        <p class="error-msg" id="errorMsg">Lütfen en az bir fotoğraf seçin veya geçerli bir resim linki yapıştırın!</p>
    `;
}
// Canlı Radar için örnek ilan çekme fonksiyonu
function populateTable() {
    const tableBody = document.getElementById('tableBody');
    // Hayali bir "pazar taraması" verisi (Koyu renkler ve bembeyaz yazılar)
    const sampleData = [
        { model: "iPhone 15 Pro Max", price: "32.000 TL", aiValue: "40.000 TL", risk: "Dolandırıcı Riski!", riskClass: "background: #C92A2A; color: white; font-weight: 600;" },
        { model: "POCO X6 Pro", price: "18.500 TL", aiValue: "19.000 TL", risk: "Uygun Fiyat", riskClass: "background: #248A3D; color: white; font-weight: 600;" },
        { model: "Samsung Galaxy S24 Ultra", price: "55.000 TL", aiValue: "62.000 TL", risk: "Şüpheli İlan (%60 Risk)", riskClass: "background: #D97706; color: white; font-weight: 600;" }
    ];

    tableBody.innerHTML = ""; // "Sistem bekliyor" yazısını siler

    sampleData.forEach(item => {
        let row = `
            <tr>
                <td>${item.model}</td>
                <td>${item.price}</td>
                <td style="font-weight: 600;">${item.aiValue}</td>
                <td><span class="badge" style="${item.riskClass}">${item.risk}</span></td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}
// Google Girişini Karşılayan Fonksiyon
function handleCredentialResponse(response) {
    // Google'dan gelen şifreli paketi (JWT) parçalayıp kullanıcı bilgilerini alıyoruz
    const responsePayload = decodeJwtResponse(response.credential);

    window.currentUserEmail = responsePayload.email; // Kullanıcı e-posta bilgisi sisteme kaydedilir.

    localStorage.setItem('userData', JSON.stringify({
        name: responsePayload.name,
        email: responsePayload.email,
        picture: responsePayload.picture
    }));

    console.log("Giriş başarılı. Kullanıcı:", responsePayload.name);

    // Sidebar'daki giriş butonunu silip yerine profil resmini koyalım
    const userSection = document.getElementById('userSection');
    userSection.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; padding: 5px;">
            <img src="${responsePayload.picture}" style="width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; flex-direction: column; flex-grow: 1;">
                <span style="font-size: 13px; font-weight: 600; color: white;">${responsePayload.name}</span>
                <span style="font-size: 10px; color: var(--text-muted);">Aktif Kullanıcı</span>
            </div>
            <button onclick="logout()" class="logout-btn" title="Çıkış Yap">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
        </div>
    `;

    // Bu bilgiyi sunucuya (backend) gönderip MongoDB'ye kaydetmesini isteyeceğiz (Bir sonraki adımda!)
    saveUserToDatabase(response.credential);
}
async function saveUserToDatabase(idToken) {
    try {
        const response = await fetch('https://piyasa-ai.onrender.com/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken })
        });
        const result = await response.json();
        console.log("Sunucu yanıtı:", result.message);
    } catch (error) {
        console.error("Kullanıcı kaydedilirken hata oluştu:", error);
    }
}

// Şifreli veriyi çözmek için yardımcı küçük bir araç
function decodeJwtResponse(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Alarm Penceresini Açan Fonksiyon
function openAlarmModal(modelName) {
    document.getElementById('alarmModelInput').value = modelName;
    document.getElementById('alarmPriceInput').value = '';
    document.getElementById('alarmModal').style.display = 'flex';
}

// Gerçek Alarm Kaydetme Fonksiyonu (Postacı)
async function saveAlarm() {
    const model = document.getElementById('alarmModelInput').value;
    const price = document.getElementById('alarmPriceInput').value;

    // 1. Kontrol: Fiyat yazılmış mı?
    if (!price) {
        alert("Lütfen geçerli bir fiyat giriniz.");
        return;
    }

    // 2. Kontrol: Giriş yapılmış mı?
    if (!window.currentUserEmail) {
        alert("Alarm kurmak için lütfen sol menüden Google ile giriş yapınız.");
        return;
    }

    try {
        // Butonun yazısını değiştirelim ki adam beklediğini anlasın
        const btn = document.querySelector('#alarmModal button');
        const eskiYazi = btn.innerText;
        btn.innerText = "Kaydediliyor... ⏳";

        // Paketi Render sunucusuna fırlatıyoruz!
        const response = await fetch('https://piyasa-ai.onrender.com/add-alarm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: window.currentUserEmail,
                model: model,
                targetPrice: parseInt(price.toString().replace(/\./g, ''), 10)
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(`${model} cihazı ${price} TL altına düşünce sana haber vereceğiz.`);
            document.getElementById('alarmModal').style.display = 'none'; // Pencereyi kapat
        } else {
            alert("Bir hata oluştu: " + data.error);
        }

        btn.innerText = eskiYazi; // Butonu eski haline getir

    } catch (err) {
        alert("Sunucuya ulaşılamadı, internetini kontrol et!");
    }
}

async function loadMyAlarms() {
    const alarmList = document.getElementById('alarmList');
    if (!window.currentUserEmail) {
        alarmList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Alarmlarınızı görmek için lütfen giriş yapınız.</div>';
        return;
    }

    try {
        const response = await fetch(`https://piyasa-ai.onrender.com/my-alarms?email=${window.currentUserEmail}`);
        const data = await response.json();

        if (data.alarmlar && data.alarmlar.length > 0) {
            alarmList.innerHTML = data.alarmlar.map(alarm => `
    <div style="background: var(--bg-absolute); padding: 15px; border-radius: 8px; border: 1px solid var(--border-light); margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        <div>
            <div style="font-weight: 600; color: white;">${alarm.model}</div>
            <div style="font-size: 12px; color: var(--text-muted);">Hedef Fiyat: ${Number(alarm.targetPrice).toLocaleString('tr-TR')} TL</div>
        </div>
        <button onclick="deleteAlarm('${alarm.model}')" style="background: none; border: 1px solid var(--risk-high); color: var(--risk-high); padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;">Sil</button>
    </div>
`).join('');
        } else {
            alarmList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Henüz bir alarm kurmadınız.</div>';
        }
    } catch (error) {
        console.error("Alarmlar yüklenirken hata oluştu:", error);
    }
}

function logout() {
    localStorage.removeItem('userData');
    location.reload();
}

async function deleteAlarm(modelName) {
    if (!confirm(`${modelName} alarmını silmek istediğinize emin misiniz?`)) return;

    try {
        const response = await fetch('https://piyasa-ai.onrender.com/delete-alarm', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: window.currentUserEmail,
                model: modelName
            })
        });
        const data = await response.json();
        if (data.success) {
            loadMyAlarms(); // Listeyi yeniler
        }
    } catch (err) {
        alert("Silme işlemi sırasında sunucuya ulaşılamadı.");
    }
}

async function sendFeedback(isCorrect) {
    const feedbackBox = document.getElementById('communityFeedback');
    feedbackBox.innerHTML = '<p style="font-size: 13px; color: var(--risk-low);"><i class="fa-solid fa-circle-check"></i> Geri bildiriminiz için teşekkürler! Piyasa veri tabanına işlendi.</p>';
    
    if (isCorrect && window.lastAnalyzedScore >= 75) {
        try {
            await fetch('https://piyasa-ai.onrender.com/report-fraud', { method: 'POST' });
            setTimeout(fetchGlobalStats, 1000); 
        } catch (e) { console.log("Geri bildirim gönderilemedi."); }
    }
}

// ==========================================
// CİHAZIM NE KADAR EDER? - SİHİRBAZ KODLARI
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const wizardInput = document.getElementById('wizardModelInput');
    const wizardDropdown = document.getElementById('wizardDropdownList');
    const wizardHidden = document.getElementById('wizardModel');

    if (!wizardInput || !wizardDropdown) return;

    function renderWizardDropdown(filterText = "") {
        wizardDropdown.innerHTML = "";
        const models = Object.keys(frontEndDB);
        const filtered = models.filter(m => m.toLowerCase().includes(filterText.toLowerCase()));

        if (filtered.length === 0) {
            wizardDropdown.innerHTML = "<div style='padding: 10px; color: var(--text-muted); font-size: 13px;'>Sonuç bulunamadı</div>";
            return;
        }

        filtered.forEach(model => {
            let div = document.createElement('div');
            div.className = 'dropdown-item';
            div.innerText = model;
            div.onclick = function() {
                wizardInput.value = model;
                wizardHidden.value = model;
                wizardDropdown.style.display = 'none';
            };
            wizardDropdown.appendChild(div);
        });
    }

    wizardInput.addEventListener('focus', () => { renderWizardDropdown(wizardInput.value); wizardDropdown.style.display = 'block'; });
    wizardInput.addEventListener('input', (e) => { wizardHidden.value = ""; renderWizardDropdown(e.target.value); wizardDropdown.style.display = 'block'; });
    
    document.addEventListener('click', (e) => {
        if (!wizardInput.contains(e.target) && !wizardDropdown.contains(e.target)) {
            wizardDropdown.style.display = 'none';
        }
    });
});

function calculateWizardPrice() {
    const modelInput = document.getElementById('wizardModel').value;
    const condition = document.getElementById('wizardCondition').value;
    const batteryMult = parseFloat(document.getElementById('wizardBattery').value);
    const cosmeticMult = parseFloat(document.getElementById('wizardCosmetic').value);
    const resultDiv = document.getElementById('wizardResult');

    if (!frontEndDB[modelInput]) {
        alert("Lütfen listeden geçerli bir cihaz modeli seçin (Örn: iPhone 16 Pro Max)");
        return;
    }

    const dbPriceString = frontEndDB[modelInput][condition];
    if (!dbPriceString) {
        alert("Bu cihaz modeli için seçtiğiniz garanti durumuna ait fiyat verisi bulunamadı.");
        return;
    }

    let basePrice = 0;
    const numbers = dbPriceString.match(/\d+\.\d+/g); 
    if (numbers && numbers.length === 2) {
        const min = parseInt(numbers[0].replace('.', ''));
        const max = parseInt(numbers[1].replace('.', ''));
        basePrice = (min + max) / 2;
    } else if (numbers && numbers.length === 1) {
        basePrice = parseInt(numbers[0].replace('.', ''));
    } else {
        alert("Fiyat hesaplanırken veritabanı hatası oluştu.");
        return;
    }

    let finalPrice = basePrice * batteryMult * cosmeticMult;
    const fastPrice = finalPrice * 0.88; 
    const patientPrice = finalPrice * 1.10; 

    document.getElementById('priceFast').innerText = fastPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + " TL";
    document.getElementById('priceNormal').innerText = finalPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + " TL";
    document.getElementById('pricePatient').innerText = patientPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + " TL";

    resultDiv.style.display = 'block';
}

// Paylaşılan Analizi Getirme Fonksiyonu
async function loadSharedAnalysis(id) {
    const box = document.getElementById('dropZone');
    const resultBox = document.getElementById('analysisResult');
    
    box.style.display = 'none';
    resultBox.style.display = 'block';
    
    document.getElementById('scannedUrl').innerText = "Buluttan çekiliyor...";
    document.getElementById('scoreResult').innerText = "...";
    document.getElementById('keywordResult').innerText = "...";
    document.getElementById('aiDecision').innerHTML = `<strong>Analiz Yükleniyor...</strong>`;

    try {
        const response = await fetch(`https://piyasa-ai.onrender.com/analysis/${id}`);
        const result = await response.json();

        if (result.success) {
            const data = result.data;
            document.getElementById('scannedUrl').innerText = "Paylaşılan Piyasa.ai Bağlantısı";
            
            const scoreBox = document.getElementById('scoreResult');
            scoreBox.innerText = "%" + data.riskScore + " Risk";
            scoreBox.style.color = data.riskScore > 50 ? 'var(--risk-high)' : (data.riskScore > 0 ? 'var(--risk-med)' : 'var(--risk-low)');
            document.getElementById('keywordResult').innerText = data.reason || "Detay bulunamadı.";

            const decisionBox = document.getElementById('aiDecision');
            if (data.riskScore >= 50) {
                decisionBox.style.borderLeftColor = 'var(--risk-high)'; decisionBox.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';
                decisionBox.innerHTML = `<div style="margin-bottom: 10px;"><strong>DİKKAT YÜKSEK RİSK:</strong> Sistem bu paylaşımda yüksek oltalama şüphesi tespit etti.</div>`;
            } else if (data.riskScore >= 20) {
                decisionBox.style.borderLeftColor = 'var(--risk-med)'; decisionBox.style.backgroundColor = 'rgba(255, 187, 51, 0.1)';
                decisionBox.innerHTML = `<div style="margin-bottom: 10px;"><strong>ORTA RİSK:</strong> Bu ilanda bazı şüpheli izler veya tutarsızlıklar bulunuyor.</div>`;
            } else {
                decisionBox.style.borderLeftColor = 'var(--risk-low)'; decisionBox.style.backgroundColor = 'rgba(0, 200, 81, 0.1)';
                decisionBox.innerHTML = `<div style="margin-bottom: 10px;"><strong>GÜVENLİ GÖRÜNÜYOR:</strong> Bu analizde bilinen bir oltalama taktiğine rastlanmadı.</div>`;
            }

            document.getElementById('shareUrlInput').value = window.location.href;
            document.getElementById('shareBox').style.display = 'block';
        } else {
            alert("Bu analiz bağlantısı geçersiz veya silinmiş.");
            resetAnalysis();
        }
    } catch (err) {
        alert("Bağlantı hatası.");
        resetAnalysis();
    }
}

// Link Kopyalama Butonu Fonksiyonu
function copyShareUrl() {
    const copyText = document.getElementById("shareUrlInput");
    copyText.select();
    copyText.setSelectionRange(0, 99999); 
    navigator.clipboard.writeText(copyText.value).then(() => {
        alert("Piyasa.ai analiz linki başarıyla kopyalandı! İstediğiniz yere yapıştırabilirsiniz.");
    });
}