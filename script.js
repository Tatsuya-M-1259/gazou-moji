document.addEventListener('DOMContentLoaded', () => {
    // 定数
    const API_KEY_STORAGE_KEY = 'amakusa_creative_gemini_api_key';

    // 1. キャンバス初期化
    const canvas = new fabric.Canvas('mainCanvas', {
        width: 1080,
        height: 1080,
        backgroundColor: '#0f172a',
        preserveObjectStacking: true
    });

    function resizePreview() {
        const container = document.getElementById('canvas-container');
        const parent = container.parentElement;
        const scale = Math.min((parent.clientWidth - 60) / 1080, (parent.clientHeight - 60) / 1080);
        container.style.transform = `scale(${scale})`;
    }
    window.addEventListener('resize', resizePreview);
    resizePreview();

    // --- 自動保存機能 ---
    const apiKeyInput = document.getElementById('geminiApiKey');
    const apiKeyStatus = document.getElementById('apiKeyStatus');

    // 保存されているキーを読み込み
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) {
        apiKeyInput.value = savedKey;
        apiKeyStatus.classList.remove('hidden');
    }

    // 入力されるたびに自動保存
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

    // --- 自動翻訳ロジック ---
    async function translatePrompt(text, key) {
        // 日本語が含まれていない場合はそのまま返す
        if (!/[ぁ-んァ-ン一-龠]/.test(text)) return text;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Translate the following image prompt into professional, descriptive English for an image generation AI. Output ONLY the translated text: ${text}` }] }]
                })
            });
            const data = await response.json();
            return data.candidates[0].content.parts[0].text.trim();
        } catch (e) {
            console.error("Translation Error:", e);
            return text; // 失敗時は元のテキストを使用
        }
    }

    // 3. Gemini Imagen 3 画像生成
    document.getElementById('generateBtn').addEventListener('click', async () => {
        const rawPrompt = document.getElementById('aiPrompt').value.trim();
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) return showToast("APIキーを入力してください");
        if (!rawPrompt) return showToast("プロンプトを入力してください");

        const btn = document.getElementById('generateBtn');
        const loader = document.getElementById('genLoader');
        const textLabel = document.getElementById('genText');

        btn.disabled = true;
        loader.classList.remove('hidden');
        textLabel.innerText = "Geminiが翻訳中...";

        try {
            // 自動翻訳の実行
            const finalPrompt = await translatePrompt(rawPrompt, apiKey);
            textLabel.innerText = "Geminiが生成中...";

            const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{ prompt: finalPrompt }],
                    parameters: { sampleCount: 1, aspectRatio: "1:1" }
                })
            });

            const data = await response.json();

            if (data.predictions && data.predictions[0].bytesBase64Encoded) {
                const base64Data = data.predictions[0].bytesBase64Encoded;
                fabric.Image.fromURL(`data:image/png;base64,${base64Data}`, (img) => {
                    img.scaleToWidth(canvas.width);
                    canvas.add(img).centerObject(img).setActiveObject(img);
                    showToast("画像を生成しました");
                    resetGenUI();
                }, { crossOrigin: 'anonymous' });
            } else {
                showToast("生成に失敗しました");
                resetGenUI();
            }
        } catch (e) {
            showToast("接続エラーが発生しました");
            resetGenUI();
        }

        function resetGenUI() {
            btn.disabled = false;
            loader.classList.add('hidden');
            textLabel.innerText = "Imagen 3 で生成する";
        }
    });

    // 4. 画像アップロード
    document.getElementById('imageUpload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target.result, (img) => {
                img.scaleToWidth(canvas.width * 0.8);
                canvas.add(img).centerObject(img).setActiveObject(img);
                showToast("画像を読み込みました");
            });
        };
        reader.readAsDataURL(file);
    });

    // 5. テキスト編集
    document.getElementById('addTextBtn').addEventListener('click', () => {
        const text = new fabric.IText('Text Here', {
            left: 200, top: 200, fontFamily: 'Inter',
            fill: '#ffffff', fontSize: 120, fontWeight: '900',
            cornerColor: '#10B981', transparentCorners: false
        });
        canvas.add(text).setActiveObject(text);
    });

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

    document.getElementById('fontSize').oninput = (e) => {
        const o = canvas.getActiveObject();
        if (o) { o.set('fontSize', parseInt(e.target.value)); canvas.renderAll(); }
    };
    document.getElementById('textColor').oninput = (e) => {
        const o = canvas.getActiveObject();
        if (o) { o.set('fill', e.target.value); canvas.renderAll(); }
    };
    document.getElementById('fontFamily').onchange = (e) => {
        const o = canvas.getActiveObject();
        if (o) { o.set('fontFamily', e.target.value); canvas.renderAll(); }
    };

    document.getElementById('bringForward').onclick = () => { const o = canvas.getActiveObject(); if(o){ canvas.bringForward(o); canvas.renderAll(); } };
    document.getElementById('sendBackward').onclick = () => { const o = canvas.getActiveObject(); if(o){ canvas.sendBackwards(o); canvas.renderAll(); } };
    document.getElementById('deleteObj').onclick = () => { const o = canvas.getActiveObject(); if(o){ canvas.remove(o); canvas.discardActiveObject(); canvas.renderAll(); } };

    // 6. スタンプ
    const stamps = ['✨', '🔥', '👑', '💖', '📍', '🌈', '⚡', '💬', '🚀', '💯', '🎨', '📸'];
    const stampList = document.getElementById('stampList');
    stamps.forEach(s => {
        const btn = document.createElement('button');
        btn.className = "text-2xl p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all active:scale-90 shadow-inner";
        btn.innerText = s;
        btn.onclick = () => {
            const stamp = new fabric.Text(s, { fontSize: 180 });
            canvas.add(stamp).centerObject(stamp).setActiveObject(stamp);
        };
        stampList.appendChild(btn);
    });

    // 7. フィルタ & トリミング
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            const img = canvas.getActiveObject();
            if (!img || img.type !== 'image') return showToast("画像を選択してください");
            img.filters = [];
            if (btn.dataset.filter !== 'none') {
                const f = new fabric.Image.filters[btn.dataset.filter]();
                img.filters.push(f);
            }
            img.applyFilters();
            canvas.renderAll();
        };
    });

    document.getElementById('cropBtn').onclick = () => {
        const img = canvas.getActiveObject();
        if (!img || img.type !== 'image') return showToast("画像を選択してください");
        img.set('clipPath', new fabric.Rect({
            width: img.width * 0.7, height: img.height * 0.7,
            originX: 'center', originY: 'center'
        }));
        canvas.renderAll();
        showToast("中央をトリミングしました");
    };

    document.getElementById('canvasBgColor').oninput = (e) => {
        canvas.setBackgroundColor(e.target.value, canvas.renderAll.bind(canvas));
    };

    // 8. 書き出し
    document.getElementById('downloadBtn').onclick = () => {
        showToast("保存用データを生成中...");
        const url = canvas.toDataURL({ format: 'png', multiplier: 2 });
        const a = document.createElement('a');
        a.download = `Creative-AI-Pro-${Date.now()}.png`;
        a.href = url;
        a.click();
    };

    function showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    }
});
