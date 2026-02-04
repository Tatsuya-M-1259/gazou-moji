document.addEventListener('DOMContentLoaded', () => {
    const API_KEY_STORAGE_KEY = 'amakusa_creative_gemini_api_key';

    // 1. キャンバス初期化
    const canvas = new fabric.Canvas('mainCanvas', {
        width: 1024,
        height: 1024,
        backgroundColor: '#0f172a',
        preserveObjectStacking: true
    });

    function resizePreview() {
        const container = document.getElementById('canvas-container');
        const parent = container.parentElement;
        const scale = Math.min((parent.clientWidth - 40) / 1024, (parent.clientHeight - 40) / 1024);
        container.style.transform = `scale(${scale})`;
    }
    window.addEventListener('resize', resizePreview);
    resizePreview();

    // APIキー管理
    const apiKeyInput = document.getElementById('geminiApiKey');
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const debugInfo = document.getElementById('debugInfo');

    const loadKey = () => {
        const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        if (savedKey) {
            apiKeyInput.value = savedKey;
            apiKeyStatus.classList.remove('hidden');
        }
    };
    loadKey();

    // 更新機能: 入力と同時に保存
    apiKeyInput.addEventListener('input', (e) => {
        const key = e.target.value.trim();
        if (key) {
            localStorage.setItem(API_KEY_STORAGE_KEY, key);
            apiKeyStatus.classList.remove('hidden');
        }
    });

    // リセット機能: 保存されたキーを完全に消去
    document.getElementById('clearApiKey').addEventListener('click', () => {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        apiKeyInput.value = '';
        apiKeyStatus.classList.add('hidden');
        debugInfo.classList.add('hidden');
        showToast("キーをリセットしました。再入力してください。");
    });

    // ツール切替ロジック
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.onclick = () => {
            const tool = btn.dataset.tool;
            if (tool === 'upload') { document.getElementById('imageUpload').click(); return; }
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.panel-content').forEach(p => p.classList.add('hidden'));
            document.getElementById(`panel-${tool}`).classList.remove('hidden');
        };
    });

    // 2. 日本語プロンプトの翻訳機能
    async function translatePrompt(text, key) {
        if (!/[ぁ-んァ-ン一-龠]/.test(text)) return text;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Translate image prompt to English: ${text}` }] }] })
            });
            const data = await res.json();
            return data.candidates[0].content.parts[0].text.trim();
        } catch (e) { return text; }
    }

    // 3. Gemini Imagen 3 画像生成
    document.getElementById('generateBtn').addEventListener('click', async () => {
        const rawPrompt = document.getElementById('aiPrompt').value.trim();
        const apiKey = apiKeyInput.value.trim();
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
                let errorMsg = `APIエラー (${response.status}): ${data.error?.message || '不明なエラー'}`;
                if (response.status === 403) {
                    errorMsg = "【権限エラー (403)】\nこのAPIキーにはImagen 3の利用権限がありません。AI StudioのSettingsでImagenが有効か確認してください。";
                }
                throw new Error(errorMsg);
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
                debugInfo.innerText = "受信データ:\n" + JSON.stringify(data, null, 2);
                debugInfo.classList.remove('hidden');
                throw new Error("画像データが空で返されました。プロンプトがブロックされた可能性があります。");
            }
        } catch (e) {
            debugInfo.innerText = e.message;
            debugInfo.classList.remove('hidden');
            showToast("生成できませんでした");
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

    document.getElementById('downloadBtn').onclick = () => {
        const url = canvas.toDataURL({ format: 'png', multiplier: 2 });
        const a = document.createElement('a');
        a.download = `Amakusa-AI-${Date.now()}.png`;
        a.href = url;
        a.click();
    };

    function showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg; t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 4000);
    }
});
