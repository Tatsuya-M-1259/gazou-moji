document.addEventListener('DOMContentLoaded', () => {
    const API_KEY_STORAGE_KEY = 'amakusa_creative_gemini_api_key';

    // 1. キャンバス初期化
    const canvas = new fabric.Canvas('mainCanvas', {
        width: 1024, // Imagen 3 標準サイズ
        height: 1024,
        backgroundColor: '#0f172a',
        preserveObjectStacking: true
    });

    function resizePreview() {
        const container = document.getElementById('canvas-container');
        const parent = container.parentElement;
        const scale = Math.min((parent.clientWidth - 60) / 1024, (parent.clientHeight - 60) / 1024);
        container.style.transform = `scale(${scale})`;
    }
    window.addEventListener('resize', resizePreview);
    resizePreview();

    // APIキーの自動保存管理
    const apiKeyInput = document.getElementById('geminiApiKey');
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) {
        apiKeyInput.value = savedKey;
        apiKeyStatus.classList.remove('hidden');
    }

    apiKeyInput.addEventListener('input', (e) => {
        const key = e.target.value.trim();
        if (key) {
            localStorage.setItem(API_KEY_STORAGE_KEY, key);
            apiKeyStatus.classList.remove('hidden');
        } else {
            localStorage.removeItem(API_KEY_STORAGE_KEY);
            apiKeyStatus.classList.add('hidden');
        }
    });

    // 2. ツール切替
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            if (tool === 'upload') { document.getElementById('imageUpload').click(); return; }
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.panel-content').forEach(p => p.classList.add('hidden'));
            document.getElementById(`panel-${tool}`).classList.remove('hidden');
        });
    });

    // 翻訳ロジック
    async function translatePrompt(text, key) {
        if (!/[ぁ-んァ-ン一-龠]/.test(text)) return text;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Translate to simple English image prompt: ${text}` }] }]
                })
            });
            const data = await res.json();
            return data.candidates[0].content.parts[0].text.trim();
        } catch (e) { return text; }
    }

    // 3. Gemini Imagen 3 画像生成
    document.getElementById('generateBtn').addEventListener('click', async () => {
        const rawPrompt = document.getElementById('aiPrompt').value.trim();
        const apiKey = apiKeyInput.value.trim();
        const debugInfo = document.getElementById('debugInfo');
        debugInfo.classList.add('hidden');

        if (!apiKey) return showToast("APIキーを入力してください");
        if (!rawPrompt) return showToast("プロンプトを入力してください");

        const btn = document.getElementById('generateBtn');
        const loader = document.getElementById('genLoader');
        const textLabel = document.getElementById('genText');

        btn.disabled = true;
        loader.classList.remove('hidden');
        textLabel.innerText = "生成中...";

        try {
            const finalPrompt = await translatePrompt(rawPrompt, apiKey);
            
            // Imagen 3 Predict Endpoint
            const MODEL = 'imagen-3.0-generate-001';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{ prompt: finalPrompt }],
                    parameters: { sampleCount: 1, aspectRatio: "1:1" }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(`API Error ${response.status}: ${data.error?.message || 'Unknown error'}`);
            }

            if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
                const b64 = data.predictions[0].bytesBase64Encoded;
                fabric.Image.fromURL(`data:image/png;base64,${b64}`, (img) => {
                    img.scaleToWidth(canvas.width);
                    canvas.add(img).centerObject(img).setActiveObject(img);
                    showToast("画像を生成しました");
                    resetUI();
                }, { crossOrigin: 'anonymous' });
            } else {
                debugInfo.innerText = "Response Body: " + JSON.stringify(data, null, 2);
                debugInfo.classList.remove('hidden');
                throw new Error("画像データが返されませんでした。詳細はデバッグ情報を確認してください。");
            }
        } catch (e) {
            console.error(e);
            showToast(e.message);
            resetUI();
        }

        function resetUI() {
            btn.disabled = false;
            loader.classList.add('hidden');
            textLabel.innerText = "Imagen 3 で生成する";
        }
    });

    // --- その他基本機能 (以前と同様) ---
    document.getElementById('imageUpload').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target.result, (img) => {
                img.scaleToWidth(canvas.width * 0.8);
                canvas.add(img).centerObject(img).setActiveObject(img);
            });
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('addTextBtn').onclick = () => {
        const t = new fabric.IText('Text Here', { left: 100, top: 100, fontFamily: 'Inter', fill: '#ffffff', fontSize: 100, fontWeight: '900' });
        canvas.add(t).setActiveObject(t);
    };

    // 同期・レイヤー・削除・フィルタ・スタンプのロジックは以前の完成版を維持
    canvas.on('selection:created', (e) => syncUI(e.selected[0]));
    canvas.on('selection:updated', (e) => syncUI(e.selected[0]));
    canvas.on('selection:cleared', () => document.getElementById('deleteObj').classList.add('hidden'));

    function syncUI(obj) {
        document.getElementById('deleteObj').classList.remove('hidden');
        if (obj.type === 'i-text' || obj.type === 'text') {
            document.getElementById('fontSize').value = obj.fontSize;
            document.getElementById('textColor').value = obj.fill;
            document.getElementById('fontFamily').value = obj.fontFamily;
        }
    }

    document.getElementById('fontSize').oninput = (e) => { const o = canvas.getActiveObject(); if(o){o.set('fontSize', parseInt(e.target.value)); canvas.renderAll();} };
    document.getElementById('textColor').oninput = (e) => { const o = canvas.getActiveObject(); if(o){o.set('fill', e.target.value); canvas.renderAll();} };
    document.getElementById('deleteObj').onclick = () => { const o = canvas.getActiveObject(); if(o){canvas.remove(o); canvas.discardActiveObject(); canvas.renderAll();} };

    // スタンプ生成
    const stamps = ['✨', '🔥', '👑', '💖', '📍', '🌈', '⚡', '💬', '🚀', '💯', '🎨', '📸'];
    const stampList = document.getElementById('stampList');
    stamps.forEach(s => {
        const b = document.createElement('button');
        b.className = "text-2xl p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all active:scale-90 shadow-inner";
        b.innerText = s;
        b.onclick = () => {
            const st = new fabric.Text(s, { fontSize: 180 });
            canvas.add(st).centerObject(st).setActiveObject(st);
        };
        stampList.appendChild(b);
    });

    document.getElementById('downloadBtn').onclick = () => {
        showToast("高画質データを書き出し中...");
        const url = canvas.toDataURL({ format: 'png', multiplier: 2 });
        const a = document.createElement('a');
        a.download = `Amakusa-Creative-${Date.now()}.png`;
        a.href = url;
        a.click();
    };

    function showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg; t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 5000); // エラーを読みやすくするため長めに表示
    }
});
