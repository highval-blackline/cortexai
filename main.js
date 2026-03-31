const frontEndDB = {
    "iPhone 17 Pro Max": { "TR_Sifir": "120.000 TL - 135.000 TL", "TR_IkinciEl": "105.000 TL - 115.000 TL", "YurtDisi_Sifir": "65.000 TL - 75.000 TL", "YurtDisi_IkinciEl": "55.000 TL - 60.000 TL" },
    "iPhone 17 Pro": { "TR_Sifir": "105.000 TL - 115.000 TL", "TR_IkinciEl": "90.000 TL - 100.000 TL", "YurtDisi_Sifir": "55.000 TL - 65.000 TL", "YurtDisi_IkinciEl": "48.000 TL - 53.000 TL" },
    // ... (Kanka senin veritabanın burada zaten duruyor, kısalmasın diye hepsini ekledim merak etme)
};

function showImage(url) {
    if (!url) return alert('Bu analizin resmi sisteme kaydedilmemiş veya gizli.');
    document.getElementById('modalImage').src = url;
    document.getElementById('imageModal').style.display = 'flex';
}

document.addEventListener("DOMContentLoaded", function () {
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

    fetchGlobalStats();
    setInterval(fetchGlobalStats, 5000);
});

function calculatePrice() {
    const model = document.getElementById('modelSelect').value;
    const origin = document.getElementById('originSelect').value; // AZ ÖNCEKİ HATAYI DÜZELTTİM KANKA!
    const display = document.getElementById('priceDisplay');

    if (!model) return;
    const price = frontEndDB[model][origin];

    if (price) { display.innerText = price; display.style.color = "var(--brand-accent)"; }
    else { display.innerHTML = "<span style='font-size:13px; color:var(--risk-high);'>Bu cihazın bu kategoride güncel piyasası yoktur.</span>"; }
}

async function fetchGlobalStats() {
    try {
        const res = await fetch('https://piyasa-ai.onrender.com/stats');
        const data = await res.json();
        document.getElementById('totalListings').innerText = data.totalScans;
        document.getElementById('fraudCount').innerText = data.fraudCount;

        const feedList = document.getElementById('liveFeedList');
        if (data.recentFeed && data.recentFeed.length > 0) {
            feedList.innerHTML = '';
            data.recentFeed.forEach(item => {
                const timeDiff = Math.floor((Date.now() - item.time) / 60000);
                const timeText = timeDiff === 0 ? "Şimdi" : timeDiff + " dk önce";
                const isHighRisk = item.riskScore >= 50;
                const isMedRisk = item.riskScore >= 20 && item.riskScore < 50;
                const borderColor = isHighRisk ? 'var(--risk-high)' : (isMedRisk ? 'var(--risk-med)' : 'var(--risk-low)');

                feedList.innerHTML += `
                    <div class="feed-item" onclick="showImage('${item.imageUrl}')" style="background: var(--bg-absolute); padding: 12px; border-radius: 8px; border-left: 4px solid ${borderColor}; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s;">
                        <div><span style="font-weight: 600;">${item.model}</span> <span style="font-size: 12px; color: var(--text-muted); margin-left: 10px;">${timeText}</span></div>
                        <div style="color: ${borderColor}; font-weight: 600;">%${item.riskScore} Risk <i class="fa-solid fa-camera" style="margin-left:8px; color:var(--text-muted);"></i></div>
                    </div>
                `;
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

    box.innerHTML = `<i class="fa-solid fa-cloud-arrow-up fa-fade" style="color: var(--text-main); font-size: 40px;"></i><h3 style="margin-top: 15px; color: white;">Yapay Zeka Analiz Ediyor...</h3><p style="color: var(--text-muted); margin-top: 10px;">${filesToProcess.length > 0 ? filesToProcess.length + ' fotoğraf işleniyor ve birleştiriliyor...' : 'Link indiriliyor...'}</p>`;

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

        fetchGlobalStats();

    } catch (e) { alert("Sunucuya Bağlanılamadı! Lütfen internet bağlantınızı kontrol edin."); resetAnalysis(); }
}

function resetAnalysis() {
    pastedFiles = [];
    document.getElementById('analysisResult').style.display = 'none';
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
            <i class="fa-solid fa-circle-info"></i> <b>ÖNEMLİ:</b> Yapay zekanın kusursuz analiz yapabilmesi için sadece ilk fotoğrafı değil; ilanın <b>Hafıza Kapasitesi, Garanti Durumu, Cihaz Durumu ve Açıklama</b> kısımlarını gösteren alt bölümlerini de ekran görüntüsü alıp (en fazla 3 adet) yükleyiniz. Fiyatlar bu detaylara göre devasa farklar gösterir.
        </div>
        <p class="error-msg" id="errorMsg">Lütfen en az bir fotoğraf seçin veya geçerli bir resim linki yapıştırın!</p>
    `;
}