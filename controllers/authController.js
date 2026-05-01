const { OAuth2Client } = require('google-auth-library');
const { getDB } = require('../config/db');
const googleClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
const client = new OAuth2Client(googleClientId);

const googleAuth = async (req, res) => {
    const { token } = req.body;
    const db = getDB().db;

    if (!db) {
        return res.status(500).json({ error: 'Veritabanı bağlantısı yok.' });
    }

    try {
        let email, name, picture;

        if (token.startsWith('ya29.')) {
            // Access Token doğrulama (Custom buton için)
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const payload = await response.json();
            if (payload.error) throw new Error('Geçersiz erişim belirteci.');
            email = payload.email;
            name = payload.name;
            picture = payload.picture;
        } else {
            // Orijinal ID Token doğrulama (Geriye dönük uyumluluk)
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: googleClientId
            });
            const payload = ticket.getPayload();
            email = payload.email;
            name = payload.name;
            picture = payload.picture;
        }

        const usersCollection = db.collection('users');
        await usersCollection.updateOne(
            { email },
            { $set: { name, picture, lastLogin: new Date() } },
            { upsert: true }
        );

        res.json({ success: true, message: 'Giriş başarılı.', user: { email, name, picture } });
    } catch (error) {
        console.error('Google Auth hatası:', error);
        res.status(401).json({ error: 'Kimlik doğrulama başarısız.' });
    }
};

module.exports = { googleAuth };
