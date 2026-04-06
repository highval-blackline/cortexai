// Vercel tetikleme satırı
// GLOBAL NATIVE ALERT EZİCİ (Android/iOS uyarılarını iptal eder)
let alertTimeout;
window.alert = function(message) {
    const alertBox = document.getElementById('customAlertBox');
    document.getElementById('customAlertText').innerText = message;
    alertBox.style.display = 'flex';
    clearTimeout(alertTimeout);
    alertTimeout = setTimeout(() => { alertBox.style.display = 'none'; }, 3500);
};
let lastFeedJSON = ""; // Son gelen veriyi hafızada tutmak için

let frontEndDB = {};

function showImage(url) {
    if (!url) return alert('Bu analizin resmi sisteme kaydedilmemiş veya gizli.');
    document.getElementById('modalImage').src = url;
    document.getElementById('imageModal').style.display = 'flex';
}

document.addEventListener("DOMContentLoaded", function () {
    // YENİ: Başlangıçta güncel fiyatları API'den (Single Source of Truth) çek
    fetch('https://piyasa-ai.onrender.com/api/database')
        .then(response => response.json())
        .then(data => {
            frontEndDB = data;
            console.log("✅ Güncel fiyatlar sunucudan başarıyla çekildi!");
            
            // YENİ: Veri geldiğinde açık olan arama kutusu varsa anında otomatik yenile
            if (document.getElementById('modelDropdownList')?.style.display === 'block') {
                document.getElementById('modelSearchInput').dispatchEvent(new Event('input'));
            }
            if (document.getElementById('wizardDropdownList')?.style.display === 'block') {
                document.getElementById('wizardModelInput').dispatchEvent(new Event('input'));
            }
            if (document.getElementById('headerDropdownList')?.style.display === 'block') {
                document.getElementById('headerSearchInput').dispatchEvent(new Event('input'));
            }
        })
        .catch(err => console.error("❌ Fiyat listesi çekilirken hata oluştu:", err));
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
        
        // YENİ: Veritabanı boşsa (Henüz sunucudan gelmediyse) loading göster
        if (models.length === 0) {
            dropdownList.innerHTML = "<div style='padding: 10px 12px; color: var(--text-muted); font-size: 13px;'><i class='fa-solid fa-circle-notch fa-spin'></i> Sunucu uyanıyor, veriler çekiliyor...</div>";
            return;
        }

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
                let timeText = "Şimdi";
                
                if (timeDiff > 0 && timeDiff < 60) {
                    timeText = timeDiff + " dk önce";
                } else if (timeDiff >= 60 && timeDiff < 1440) {
                    const diffHour = Math.floor(timeDiff / 60);
                    timeText = diffHour + " saat önce";
                } else if (timeDiff >= 1440) {
                    const diffDay = Math.floor(timeDiff / 1440);
                    timeText = diffDay + " gün önce";
                }
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
    const icon = document.getElementById('scanIcon'); 
    const btn = icon.closest('.btn-outline');

    // Apple tarzı basılma esnemesi
    btn.classList.add('clicked-effect');
    setTimeout(() => btn.classList.remove('clicked-effect'), 150);

    // Akıcı ios-spin sınıfını ekle
    icon.classList.remove('fa-spin');
    icon.classList.add('ios-spin'); 

    // MATEMATİK: 0.5 saniyelik hız x 3 tam tur = Kusursuz 1500ms.
    // Animasyon tam başladığı 0 noktasında milimetrik olarak durur.
    setTimeout(() => { 
        icon.classList.remove('ios-spin'); 
        alert('Ağ taraması tamamlandı, sistem güncel!'); 
    }, 1500);
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
            const response = await fetch('https://piyasa-ai.onrender.com/delete-alarm', {
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

        const matches = allModels.filter(m => m.toLowerCase().includes(term.toLowerCase()));

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
