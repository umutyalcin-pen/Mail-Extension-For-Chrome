const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const mainContent = document.getElementById('mainContent');
const apiKeyInput = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

let selectedTone = 'kurumsal';
let apiKey = '';

// DOM Elements
const chips = document.querySelectorAll('.chip');
const rewriteBtn = document.getElementById('rewriteBtn');
const githubBtn = document.getElementById('githubBtn');
const inputText = document.getElementById('inputText');
const outputArea = document.getElementById('outputArea');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
const btnText = document.querySelector('.btn-text');

const appTitle = document.getElementById('appTitle');

// GitHub Link via Title
if (appTitle) {
    appTitle.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://github.com/umutyalcin-pen' });
    });
}

// GitHub Link (Legacy button support if needed, though button is removed)
if (githubBtn) {
    githubBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://github.com/umutyalcin-pen' });
    });
}

// Load API Key
chrome.storage.local.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
        apiKey = result.geminiApiKey;
        apiKeyInput.value = apiKey;
    } else {
        // Show settings if no key
        toggleSettings(true);
    }
});

// Settings Logic
settingsBtn.addEventListener('click', () => toggleSettings(true));
closeSettingsBtn.addEventListener('click', () => toggleSettings(false));

saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        chrome.storage.local.set({ geminiApiKey: key }, () => {
            apiKey = key;
            toggleSettings(false);
            // Visual feedback could be added here
        });
    }
});

function toggleSettings(show) {
    if (show) {
        settingsPanel.classList.remove('hidden');
        mainContent.classList.add('hidden');
    } else {
        settingsPanel.classList.add('hidden');
        mainContent.classList.remove('hidden');
    }
}

// Tone Selection
chips.forEach(chip => {
    chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedTone = chip.dataset.tone;
    });
});

// Rewrite Action
rewriteBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();
    if (!text) return;

    if (!apiKey) {
        alert('Lütfen önce Ayarlar bölümünden API Anahtarınızı girin.');
        toggleSettings(true);
        return;
    }

    setLoading(true);
    outputArea.classList.add('hidden');

    try {
        const response = await callGeminiAPI(text, selectedTone);
        outputText.textContent = response;
        outputArea.classList.remove('hidden');
    } catch (error) {
        outputText.textContent = "Hata oluştu: " + error.message;
        outputArea.classList.remove('hidden');
    } finally {
        setLoading(false);
    }
});

// Copy Action
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(outputText.textContent).then(() => {
        const originalIcon = copyBtn.innerHTML;
        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        setTimeout(() => {
            copyBtn.innerHTML = originalIcon;
        }, 2000);
    });
});

function setLoading(isLoading) {
    if (rewriteBtn && btnText) {
        if (isLoading) {
            rewriteBtn.disabled = true;
            btnText.textContent = "Düzenleniyor...";
        } else {
            rewriteBtn.disabled = false;
            btnText.textContent = "Düzenle";
        }
    }
}


const testApiBtn = document.getElementById('testApiBtn');

// Test API Connection
if (testApiBtn) {
    testApiBtn.addEventListener('click', async () => {
        const key = apiKeyInput.value.trim();
        if (!key) {
            alert('Lütfen önce bir API anahtarı girin.');
            return;
        }

        testApiBtn.textContent = "Kontrol ediliyor...";
        testApiBtn.disabled = true;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const data = await response.json();

            if (!response.ok) {
                alert('HATA: ' + (data.error?.message || 'Bilinmeyen hata'));
            } else {
                const models = data.models?.map(m => m.name) || [];
                const hasFlash = models.some(m => m.includes('gemini-1.5-flash'));
                if (hasFlash) {
                    alert('BAŞARILI! Anahtarınız çalışıyor ve gemini-1.5-flash modeline erişimi var.');
                } else {
                    alert('Anahtar çalışıyor ama Flash modeli bulunamadı. Mevcut modeller:\n' + models.slice(0, 3).join('\n') + '...');
                }
            }
        } catch (e) {
            alert('Bağlantı hatası: ' + e.message);
        } finally {
            testApiBtn.textContent = "Bağlantıyı Test Et";
            testApiBtn.disabled = false;
        }
    });
}

async function callGeminiAPI(text, tone) {
    const modelsToTry = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-1.0-pro',
        'gemini-pro'
    ];

    let lastError = null;

    for (const model of modelsToTry) {
        try {
            console.log(`Trying model: ${model}`);
            // Always use v1beta as it is the most reliable for AI Studio keys
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            let prompt = "";
            switch (tone) {
                case 'kurumsal':
                    prompt = `Aşağıdaki metni kurumsal, profesyonel ve nazik bir e-posta diline çevir. Anlamı koru ama kaba ifadeleri düzelt. Sadece çevrilmiş metni ver, başka açıklama yapma.\n\nMetin: "${text}"`;
                    break;
                case 'arkadasca':
                    prompt = `Aşağıdaki metni samimi, sıcak ve arkadaşça bir e-posta diline çevir. Anlamı koru. Sadece çevrilmiş metni ver, başka açıklama yapma.\n\nMetin: "${text}"`;
                    break;
                case 'resmi':
                    prompt = `Aşağıdaki metni çok resmi, saygılı ve bürokratik bir dile çevir. Anlamı koru. Sadece çevrilmiş metni ver, başka açıklama yapma.\n\nMetin: "${text}"`;
                    break;
                default:
                    prompt = `Aşağıdaki metni düzelt: "${text}"`;
            }

            const data = {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const resultData = await response.json();

            if (!response.ok) {
                throw new Error(resultData.error?.message || 'API Hatası');
            }

            return resultData.candidates[0].content.parts[0].text.trim();

        } catch (error) {
            console.warn(`Model ${model} failed:`, error);
            lastError = error;
            // Continue to next model
        }
    }

    // If all hardcoded models failed, try to find ANY working model dynamically
    try {
        console.log("Hardcoded models failed. Attempting auto-discovery...");
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listResponse.json();

        if (!listData.models) throw new Error("Model listesi alınamadı.");

        if (!listData.models) throw new Error("Model listesi alınamadı.");

        // Filter models that support generateContent
        const contentModels = listData.models.filter(m =>
            m.supportedGenerationMethods &&
            m.supportedGenerationMethods.includes("generateContent")
        );

        // Sort models to prioritize: 
        // 1. Flash (Fast, high quota)
        // 2. Stable Pro
        // 3. Others
        // 4. Experimental (exp) - put at the end
        contentModels.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();

            const getScore = (name) => {
                if (name.includes('exp')) return 0; // Lowest priority
                if (name.includes('flash')) return 3; // Highest priority
                if (name.includes('pro') && !name.includes('1.0')) return 2; // High priority
                return 1; // Standard
            };

            return getScore(nameB) - getScore(nameA);
        });

        const workingModel = contentModels[0];

        if (workingModel) {
            const modelName = workingModel.name.replace('models/', '');
            console.log(`Auto-discovered working model: ${modelName}`);

            // Try one last time with the discovered model
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

            let prompt = "";
            switch (tone) {
                case 'kurumsal':
                    prompt = `Aşağıdaki metni kurumsal, profesyonel ve nazik bir e-posta diline çevir. Anlamı koru ama kaba ifadeleri düzelt. Sadece çevrilmiş metni ver, başka açıklama yapma.\n\nMetin: "${text}"`;
                    break;
                case 'arkadasca':
                    prompt = `Aşağıdaki metni samimi, sıcak ve arkadaşça bir e-posta diline çevir. Anlamı koru. Sadece çevrilmiş metni ver, başka açıklama yapma.\n\nMetin: "${text}"`;
                    break;
                case 'resmi':
                    prompt = `Aşağıdaki metni çok resmi, saygılı ve bürokratik bir dile çevir. Anlamı koru. Sadece çevrilmiş metni ver, başka açıklama yapma.\n\nMetin: "${text}"`;
                    break;
                default:
                    prompt = `Aşağıdaki metni düzelt: "${text}"`;
            }

            const data = {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const resultData = await response.json();

            if (!response.ok) {
                throw new Error(resultData.error?.message || 'Otomatik seçilen model de hata verdi.');
            }

            return resultData.candidates[0].content.parts[0].text.trim();
        } else {
            throw new Error("Kullanılabilir metin üretim modeli bulunamadı.");
        }

    } catch (autoError) {
        throw new Error(`Tüm modeller ve otomatik deneme başarısız oldu. \nSon hata: ${autoError.message}`);
    }
}


