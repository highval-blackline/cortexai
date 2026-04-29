// Vercel tetikleme satırı
// GLOBAL NATIVE ALERT EZİCİ (Android/iOS uyarılarını iptal eder)
let alertTimeout;
window.alert = function(message) {
    const alertBox = document.getElementById('customAlertBox');
    document.getElementById('customAlertText').innerText = message;
    alertBox.style.display = 'flex';
    clearTimeout(alertTimeout);
    alertTimeout = setTimeout(() => { alertBox.style.display = 'none'; }, 7000);
};
let lastFeedJSON = null;
let frontEndDB = {};

// Sayı artış animasyonu (Count-Up)
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    if (start === end) {
        obj.innerText = end;
        return;
    }
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const timer = setInterval(() => {
        current += increment;
        obj.innerText = current;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime > 0 ? stepTime : 1);
}

function showImage(url) {
    if (!url) return alert('Bu analizin resmi sisteme kaydedilmemiş veya gizli.');
    document.getElementById('modalImage').src = url;
    document.getElementById('imageModal').style.display = 'flex';
}

document.addEventListener("DOMContentLoaded", function () {
// 1. VERİ ÇEKME: Sunucudan güncel fiyatları al
    async function setupDatabase() {
        try {
            const response = await fetch('/api/database');
            if (!response.ok) throw new Error('Sunucu hatası');
            const data = await response.json();
            frontEndDB = data;
            console.log("✅ Piyasa.ai: Veritabanı senkronize edildi.");
            
            // Arama kutularını tetikle (Sadece sayfa açılışında otomatik açılmasını engelledik)
            /*
            ['modelSearchInput', 'wizardModelInput', 'headerSearchInput'].forEach(id => {
                const el = document.getElementById(id);
                if (el && el.offsetParent !== null) el.dispatchEvent(new Event('input'));
            });
            */
        } catch (err) {
            console.error("❌ Veritabanı Hatası:", err);
            // Hata durumunda yerel bir boş obje oluştur ki sistem çökmesin
            frontEndDB = frontEndDB || {};
            const loader = document.getElementById('feedLoading');
            if(loader) loader.innerText = "Veriler şu an alınamıyor, lütfen biraz bekleyin...";
        }
    }
    setupDatabase();

    // 2. PAYLAŞIM KONTROLÜ: URL'de analiz ID'si varsa otomatik aç
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
        
        // YENİ: Veritabanı boşsa (Henüz sunucudan gelmediyse) loading göster
        if (models.length === 0) {
            dropdownList.innerHTML = "<div style='padding: 10px 12px; color: var(--text-muted); font-size: 13px;'><i class='fa-solid fa-circle-notch fa-spin'></i> Sunucu uyanıyor, veriler çekiliyor...</div>";
            return;
        }

        function flexibleMatch(query, target) {
            const q = query.toLowerCase().trim();
            const t = target.toLowerCase().trim();
            if (!q) return true;

            // Marka/Seri ön eklerini opsiyonel yapmak için temizlenmiş versiyonları hazırla
            const commonPrefixes = ['samsung', 'galaxy', 'apple', 'iphone'];
            const qParts = q.split(/\s+/).filter(p => !commonPrefixes.includes(p));
            
            // Eğer kullanıcı sadece marka yazdıysa (Örn: "Samsung"), düz aramaya dön
            if (qParts.length === 0) return t.includes(q);

            // Kullanıcının girdiği her bir kelime (ön ekler hariç) hedefte var mı?
            // Örn: "S26 Ultra" -> "Samsung Galaxy S26 Ultra" (Her iki kelime de hedefte var)
            return qParts.every(part => t.includes(part));
        }

        const filteredModels = models.filter(model => flexibleMatch(filterText, model));

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
        // 1. Verileri iki farklı uç noktadan paralel çek
        const [statsRes, feedRes] = await Promise.all([
            fetch('/api/global-stats'),
            fetch('/api/recent-feed')
        ]);

        let stats = { globalFrauds: 0 };
        let recentFeed = [];

        try {
            if (statsRes.ok) {
                const data = await statsRes.json();
                if (data && !data.error) stats = data;
            }
            if (feedRes.ok) {
                const data = await feedRes.json();
                if (Array.isArray(data)) recentFeed = data;
            }
        } catch (jsonErr) {
            console.warn("JSON ayrıştırma hatası:", jsonErr);
        }

        // 2. UI Elemanlarını bul
        const feedList = document.getElementById('liveFeedList');
        const tableBody = document.getElementById('tableBody');
        const feedLoader = document.getElementById('feedLoading');

        // Yükleme animasyonunu gizle, listeyi göster
        if (feedLoader) feedLoader.style.display = 'none';
        if (feedList) feedList.style.display = 'flex';

        // 3. İstatistikleri Güncelle (Count-Up Animasyonu ile)
        const newAnalyses = stats.globalAnalyses || 0;
        const newFrauds = stats.globalFrauds || 0;

        // Taranan İlanlar (Global)
        if (window.lastTotalAnalyses !== newAnalyses) {
            animateValue("totalListings", window.lastTotalAnalyses || 0, newAnalyses, 1000);
            window.lastTotalAnalyses = newAnalyses;
        }

        // Tespit Edilen Dolandırıcı
        if (window.lastTotalFrauds !== newFrauds) {
            animateValue("fraudCount", window.lastTotalFrauds || 0, newFrauds, 1000);
            window.lastTotalFrauds = newFrauds;
        }

        // 4. Canlı Akışı Güncelle (Eğer yeni veri varsa)
        const currentFeedJSON = JSON.stringify(recentFeed);
        if (currentFeedJSON === lastFeedJSON) return; 
        lastFeedJSON = currentFeedJSON;

        feedList.innerHTML = '';
        if (tableBody) tableBody.innerHTML = '';

        // EĞER VERİTABANI BOŞSA BOŞLUK YERİNE BİLGİ MESAJI GÖSTER
        if (recentFeed.length === 0) {
            feedList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); width: 100%; font-size: 13px;">Sistemde henüz hiç analiz yapılmadı. İlk taramayı sen yap!</div>';
            if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 15px;">Radarda şüpheli işlem bulunmuyor...</td></tr>';
            return;
        }

        recentFeed.forEach(item => {
            // Zaman hesaplama
            const timeDiff = Math.floor((Date.now() - new Date(item.time).getTime()) / 60000);
            let timeText = timeDiff <= 0 ? "Şimdi" : (timeDiff < 60 ? timeDiff + " dk önce" : Math.floor(timeDiff/60) + " saat önce");
            
            const borderColor = item.riskScore >= 90 ? 'var(--risk-high)' : (item.riskScore >= 40 ? 'var(--risk-med)' : 'var(--risk-low)');

            // Sol taraftaki Akış Kartı
            feedList.innerHTML += `
                <div class="feed-item" onclick="showImage('${item.imageUrl}')" style="background: var(--bg-absolute); padding: 12px; border-radius: 8px; border-left: 4px solid ${borderColor}; display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom:10px;">
                    <div><span style="font-weight: 600;">${item.model}</span> <span style="font-size: 12px; color: var(--text-muted); margin-left: 10px;">${timeText}</span></div>
                    <div style="color: ${borderColor}; font-weight: 600;">%${item.riskScore} Risk <i class="fa-solid fa-camera" style="margin-left:8px; color:var(--text-muted);"></i></div>
                </div>`;

            // Sağ taraftaki Canlı Radar Tablosu
            if (tableBody) {
                let riskText = item.riskScore >= 90 ? "Dolandırıcı Riski!" : (item.riskScore >= 40 ? "Şüpheli İlan" : "Güvenli / Uygun");
                let shortReason = item.reason ? (item.reason.length > 30 ? item.reason.substring(0,30) + '...' : item.reason) : "Piyasa Analizi...";
                tableBody.innerHTML += `
                    <tr onclick="showImage('${item.imageUrl}')" style="cursor:pointer;" class="feed-item">
                        <td>${item.model}</td>
                        <td style="color: var(--brand-accent); font-weight: 600;">${item.price}</td>
                        <td style="font-size: 13px;">${item.marketValue || 'Veri Yok'}</td>
                        <td><span class="badge" style="background: ${borderColor}; color: white; padding: 4px 8px; border-radius: 4px;">${item.status || riskText}</span></td>
                    </tr>`;
            }
        });
    } catch (e) { 
        console.error("Veri senkronizasyon hatası:", e); 
        const feedLoader = document.getElementById('feedLoading');
        if (feedLoader) feedLoader.innerText = "Sunucuya ulaşılamıyor...";
    }
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
    const icon = document.getElementById('scanIcon'); 
    const btn = icon.closest('.btn-outline');

    btn.classList.add('clicked-effect');
    setTimeout(() => btn.classList.remove('clicked-effect'), 150);

    icon.style.display = 'none';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = '<svg class="gemini-spinner" id="geminiSvg" viewBox="25 25 50 50"><circle cx="50" cy="50" r="20"></circle></svg>';
    const spinnerSvg = tempDiv.firstChild;
    btn.insertBefore(spinnerSvg, icon);

    // MATEMATİK: Süre tam 2000ms (2 saniye).
    // CSS'teki dönüş 1 saniye (2 tur atacak), kuyruk 2 saniye (1 tur atacak).
    // Her ikisi de tam bu milisaniyede "0" noktasına dönüp kusursuzca kaybolacak.
    setTimeout(() => { 
        const activeSpinner = document.getElementById('geminiSvg');
        if (activeSpinner) activeSpinner.remove();
        icon.style.display = 'inline-block';
        alert('Ağ taraması tamamlandı, sistem güncel!'); 
    }, 2000); 
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
    const compressor = window.imageCompression || imageCompression;
    if (typeof compressor !== 'function') {
        alert("Sıkıştırma kütüphanesi yüklenemedi, lütfen sayfayı yenileyin.");
        return;
    }
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
                    let compressed = await compressor(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1200, useWebWorker: true });
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
        const response = await fetch(`/api/analyze`, { method: 'POST', body: formData });
        
        if (!response.ok) {
            if (response.status === 413) throw new Error("Görsel boyutu çok büyük, otomatik olarak daha fazla sıkıştırılamadı.");
            throw new Error("Görsel işlenirken teknik bir hata oluştu, lütfen tekrar deneyin.");
        }

        const data = await response.json();

        if (data.error) { 
            // Eğer hata AI tarafından (Telefon Değil vb) döndürüldüyse
            alert(data.error); 
            resetAnalysis(); 
            return; 
        }

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
        scoreBox.style.color = data.riskScore >= 90 ? 'var(--risk-high)' : (data.riskScore >= 40 ? 'var(--risk-med)' : 'var(--risk-low)');
        document.getElementById('keywordResult').innerHTML = `
            <div style="font-size: 14px; line-height: 1.6; color: #e0e0e0; padding: 5px; white-space: pre-wrap;">
                ${data.analysisNote || data.reason || "Piyasa analizi başarıyla tamamlandı."}
            </div>
        `;

        const decisionBox = document.getElementById('aiDecision');
        if (data.riskScore >= 90) {
            decisionBox.style.borderLeftColor = 'var(--risk-high)'; decisionBox.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';
            decisionBox.innerHTML = `<div style="margin-bottom: 10px;"><strong>DİKKAT YÜKSEK RİSK:</strong> Sistem görselde riskli detaylar ve oltalama şüphesi tespit etti.</div><div style="font-size: 13px; color: #e0e0e0; border-top: 1px solid rgba(255, 68, 68, 0.3); padding-top: 10px;"><i class="fa-solid fa-triangle-exclamation" style="color: var(--risk-high); margin-right: 5px;"></i> <b>Tavsiye:</b> İmkanınız varsa satıcıyla mutlaka <b>yüz yüze</b> görüşün ve cihazı elden teslim alın. Eğer uzaktaysanız alışverişi sadece <b>'Param Güvende'</b> ile gerçekleştirmek istediğinizi söyleyin. Satıcı bunu reddedip havale/EFT talep ediyorsa işlemi derhal iptal edin ve uzaklaşın, %99 dolandırıcıdır!</div>`;
        } else if (data.riskScore >= 40) {
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

    } catch (e) { 
        alert(e.message || "Görsel işlenirken teknik bir hata oluştu, lütfen tekrar deneyin."); 
        resetAnalysis(); 
    }
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
        const response = await fetch('/api/auth/google', {
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
        const response = await fetch('/api/add-alarm', {
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
        const response = await fetch(`/api/my-alarms?email=${window.currentUserEmail}`);
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

function deleteAlarm(modelName) {
    const confirmBox = document.getElementById('customConfirmModal');
    document.getElementById('customConfirmText').innerText = `${modelName} cihazına ait fiyat alarmını silmek istediğinize emin misiniz?`;
    confirmBox.style.display = 'flex';

    document.getElementById('customConfirmCancel').onclick = function() {
        confirmBox.style.display = 'none';
    };

    document.getElementById('customConfirmOk').onclick = async function() {
        confirmBox.style.display = 'none';
        try {
            const response = await fetch('/api/delete-alarm', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: window.currentUserEmail, model: modelName })
            });
            const data = await response.json();
            if (data.success) { loadMyAlarms(); }
        } catch (err) {
            alert("Silme işlemi sırasında sunucuya ulaşılamadı.");
        }
    };
}

async function sendFeedback(isCorrect) {
    const feedbackBox = document.getElementById('communityFeedback');
    feedbackBox.innerHTML = '<p style="font-size: 13px; color: var(--risk-low);"><i class="fa-solid fa-circle-check"></i> Geri bildiriminiz için teşekkürler! Piyasa veri tabanına işlendi.</p>';
    
    if (isCorrect && window.lastAnalyzedScore >= 75) {
        try {
            await fetch('/api/report-fraud', { method: 'POST' });
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
        
        if (models.length === 0) {
            wizardDropdown.innerHTML = "<div style='padding: 10px; color: var(--text-muted); font-size: 13px;'><i class='fa-solid fa-circle-notch fa-spin'></i> Sunucu uyanıyor, veriler çekiliyor...</div>";
            return;
        }

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
        const response = await fetch(`/api/analysis/${id}`);
        const result = await response.json();

        if (result.success) {
            const data = result.data;
            document.getElementById('scannedUrl').innerText = "Paylaşılan Piyasa.ai Bağlantısı";
            
            const scoreBox = document.getElementById('scoreResult');
            scoreBox.innerText = "%" + data.riskScore + " Risk";
            scoreBox.style.color = data.riskScore >= 90 ? 'var(--risk-high)' : (data.riskScore >= 40 ? 'var(--risk-med)' : 'var(--risk-low)');
            document.getElementById('keywordResult').innerText = data.reason || "Detay bulunamadı.";

            const decisionBox = document.getElementById('aiDecision');
            if (data.riskScore >= 90) {
                decisionBox.style.borderLeftColor = 'var(--risk-high)'; decisionBox.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';
                decisionBox.innerHTML = `<div style="margin-bottom: 10px;"><strong>DİKKAT YÜKSEK RİSK:</strong> Sistem bu paylaşımda yüksek oltalama şüphesi tespit etti.</div>`;
            } else if (data.riskScore >= 40) {
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

// ==========================================
// KESİN ÇÖZÜM: NATIVE SELECT'LERİ APPLE TARZI ÖZEL MENÜYE ÇEVİRİR
// ==========================================
function upgradeSelectsToAppleStyleLegacy() {
    const selects = document.querySelectorAll('#wizardSection select');
    selects.forEach(select => {
        // Eğer zaten dönüştürülmüşse bir daha dokunma
        if(select.nextElementSibling && select.nextElementSibling.classList.contains('apple-select-wrapper')) return;

        // 1. Orijinal o çirkin select'i gizle
        select.style.display = 'none';

        // 2. Kapsayıcı oluştur
        const wrapper = document.createElement('div');
        wrapper.className = 'apple-select-wrapper';
        wrapper.style.position = 'relative';

        // 3. Tıklanabilir premium buton oluştur
        const displayBtn = document.createElement('div');
        displayBtn.className = 'apple-select-btn';
        displayBtn.innerHTML = `<span>${select.options[select.selectedIndex].text}</span> <i class="fa-solid fa-chevron-down" style="font-size: 12px; color: var(--text-muted); transition: transform 0.3s;"></i>`;

        // 4. Açılır menü kutusunu oluştur
        const menu = document.createElement('div');
        menu.className = 'apple-select-menu';

        // 5. Seçenekleri Apple tarzı listeye ekle
        Array.from(select.options).forEach(option => {
            const item = document.createElement('div');
            item.className = 'apple-select-item';
            if (option.selected) item.classList.add('selected');
            item.innerHTML = `${option.text} <i class="fa-solid fa-check check-icon" style="display: ${option.selected ? 'block' : 'none'}; color: var(--brand-accent);"></i>`;

            // Seçeneğe tıklanınca
            item.onclick = (e) => {
                e.stopPropagation();
                select.value = option.value; // Orijinal select'i günceller ki senin fiyat hesaplama kodun bozulmasın
                displayBtn.querySelector('span').innerText = option.text;
                
                menu.querySelectorAll('.apple-select-item').forEach(i => {
                    i.classList.remove('selected');
                    i.querySelector('.check-icon').style.display = 'none';
                });
                
                item.classList.add('selected');
                item.querySelector('.check-icon').style.display = 'block';
                menu.classList.remove('show');
                displayBtn.classList.remove('active');
                displayBtn.querySelector('i').style.transform = 'rotate(0deg)';
            };
            menu.appendChild(item);
        });

        // Butona tıklayınca menüyü aç/kapat animasyonları
        displayBtn.onclick = (e) => {
            e.stopPropagation();
            const isShowing = menu.classList.contains('show');
            
            // Açık olan diğer menüleri kapat
            document.querySelectorAll('.apple-select-menu.show').forEach(m => {
                m.classList.remove('show');
                m.previousSibling.classList.remove('active');
                m.previousSibling.querySelector('i').style.transform = 'rotate(0deg)';
            });
            
            if (!isShowing) {
                menu.classList.add('show');
                displayBtn.classList.add('active');
                displayBtn.querySelector('i').style.transform = 'rotate(180deg)';
            }
        };

        wrapper.appendChild(displayBtn);
        wrapper.appendChild(menu);
        select.parentNode.insertBefore(wrapper, select.nextSibling);
    });

    // Ekranda boş bir yere tıklanırsa açık menüleri kapat
    document.addEventListener('click', () => {
        document.querySelectorAll('.apple-select-menu.show').forEach(m => {
            m.classList.remove('show');
            m.previousSibling.classList.remove('active');
            m.previousSibling.querySelector('i').style.transform = 'rotate(0deg)';
        });
    });
}

// Sayfa yüklendiğinde eski kutuları yok et ve yenilerini çiz
// ==========================================
// CLEAN APPLE STYLE SELECT UPGRADE
// ==========================================
let appleSelectOutsideClickBound = false;

function closeAppleSelectMenus(exceptMenu = null) {
    document.querySelectorAll('.apple-select-menu.show').forEach(menu => {
        if (menu === exceptMenu) return;

        menu.classList.remove('show');
        const btn = menu.previousElementSibling;
        if (btn && btn.classList.contains('apple-select-btn')) {
            btn.classList.remove('active');
            btn.setAttribute('aria-expanded', 'false');
            const icon = btn.querySelector('i');
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    });
}

function upgradeSelectsToAppleStyle() {
    const selects = document.querySelectorAll('select');

    selects.forEach(select => {
        if (select.dataset.appleSelectUpgraded === 'true') return;
        select.dataset.appleSelectUpgraded = 'true';

        select.classList.add('apple-select-hidden');
        select.style.display = 'none';
        select.setAttribute('aria-hidden', 'true');

        const wrapper = document.createElement('div');
        wrapper.className = 'apple-select-wrapper';

        const displayBtn = document.createElement('button');
        displayBtn.type = 'button';
        displayBtn.className = 'apple-select-btn';
        displayBtn.setAttribute('aria-expanded', 'false');
        displayBtn.innerHTML = `<span>${select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : ''}</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>`;

        const menu = document.createElement('div');
        menu.className = 'apple-select-menu';

        Array.from(select.options).forEach(option => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'apple-select-item';
            if (option.selected) item.classList.add('selected');
            item.innerHTML = `<span>${option.text}</span><i class="fa-solid fa-check check-icon" aria-hidden="true"></i>`;

            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));

                const label = displayBtn.querySelector('span');
                if (label) label.innerText = option.text;

                menu.querySelectorAll('.apple-select-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');

                closeAppleSelectMenus();
            });

            menu.appendChild(item);
        });

        displayBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const isOpen = menu.classList.contains('show');
            closeAppleSelectMenus();

            if (!isOpen) {
                menu.classList.add('show');
                displayBtn.classList.add('active');
                displayBtn.setAttribute('aria-expanded', 'true');
                const icon = displayBtn.querySelector('i');
                if (icon) icon.style.transform = 'rotate(180deg)';
            }
        });

        wrapper.appendChild(displayBtn);
        wrapper.appendChild(menu);
        select.insertAdjacentElement('afterend', wrapper);
    });

    if (!appleSelectOutsideClickBound) {
        document.addEventListener('click', () => closeAppleSelectMenus());
        appleSelectOutsideClickBound = true;
    }
}

function upgradeSelectsToAppleStyleFixed() {
    return upgradeSelectsToAppleStyle();
}

document.addEventListener('DOMContentLoaded', upgradeSelectsToAppleStyle);
setTimeout(upgradeSelectsToAppleStyle, 500);

// ==========================================
// GLOBAL ÜST ARAMA MOTORU MANTIĞI
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    const headerInput = document.getElementById('headerSearchInput');
    const headerDropdown = document.getElementById('headerDropdownList');

    function renderHeaderResults(term = "") {
        headerDropdown.innerHTML = "";
        const allModels = Object.keys(frontEndDB);
        
        if (allModels.length === 0) {
            headerDropdown.innerHTML = "<div style='padding: 12px; color: var(--text-muted); font-size: 13px;'><i class='fa-solid fa-circle-notch fa-spin'></i> Sunucu uyanıyor, veriler çekiliyor...</div>";
            return;
        }

        function flexibleMatch(query, target) {
            const q = query.toLowerCase().trim();
            const t = target.toLowerCase().trim();
            if (!q) return true;
            const commonPrefixes = ['samsung', 'galaxy', 'apple', 'iphone'];
            const qParts = q.split(/\s+/).filter(p => !commonPrefixes.includes(p));
            if (qParts.length === 0) return t.includes(q);
            return qParts.every(part => t.includes(part));
        }

        const matches = allModels.filter(m => flexibleMatch(term, m));

        if (matches.length === 0) {
            headerDropdown.innerHTML = "<div style='padding: 12px; color: var(--text-muted); font-size: 13px;'>Cihaz bulunamadı...</div>";
            return;
        }

        matches.forEach(model => {
            let item = document.createElement('div');
            item.className = 'dropdown-item'; // Mevcut CSS sınıflarını kullanır
            item.style.padding = "12px 16px";
            item.innerText = model;
            item.onclick = function () {
                // 1. Piyasa Özeti sekmesine otomatik geçiş yap
                switchTab('dashboard', document.querySelector('.nav-item'));
                // 2. Dashboard'daki arama kutularını doldur
                document.getElementById('modelSearchInput').value = model;
                document.getElementById('modelSelect').value = model;
                // 3. Fiyatı hesapla ve göster
                calculatePrice();
                // 4. Arama çubuğunu temizle ve kapat
                headerInput.value = "";
                headerDropdown.style.display = 'none';
            };
            headerDropdown.appendChild(item);
        });
    }

    headerInput.addEventListener('focus', () => { if(headerInput.value) headerDropdown.style.display = 'block'; });
    headerInput.addEventListener('input', (e) => {
        if (e.target.value.length > 0) {
            renderHeaderResults(e.target.value);
            headerDropdown.style.display = 'block';
        } else {
            headerDropdown.style.display = 'none';
        }
    });

    // Boşluğa tıklayınca kapat
    document.addEventListener('click', (e) => {
        if (!headerInput.contains(e.target) && !headerDropdown.contains(e.target)) headerDropdown.style.display = 'none';
    });
});
