document.addEventListener('DOMContentLoaded', () => {
    // 1. キャンバスの初期化 (Instagram基準 1080x1080)
    const canvas = new fabric.Canvas('mainCanvas', {
        width: 1080,
        height: 1080,
        backgroundColor: '#0f172a',
        preserveObjectStacking: true
    });

    // プレビューの自動スケール調整
    function updatePreviewScale() {
        const container = document.getElementById('canvas-container');
        const parent = container.parentElement;
        const padding = 64;
        const scale = Math.min(
            (parent.clientWidth - padding) / 1080,
            (parent.clientHeight - padding) / 1080
        );
        container.style.transform = `scale(${scale})`;
    }
    window.addEventListener('resize', updatePreviewScale);
    updatePreviewScale();

    // 2. サイドバーのツール切替
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            if (tool === 'upload') {
                document.getElementById('imageUpload').click();
                return;
            }
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.panel-content').forEach(p => p.classList.add('hidden'));
            document.getElementById(`panel-${tool}`).classList.remove('hidden');
        });
    });

    // 3. Gemini Imagen 3 画像生成
    document.getElementById('generateBtn').addEventListener('click', async () => {
        const prompt = document.getElementById('aiPrompt').value.trim();
        const apiKey = document.getElementById('geminiApiKey').value.trim();

        if (!apiKey) return showToast("APIキーを入力してください");
        if (!prompt) return showToast("プロンプトを入力してください");

        const btn = document.getElementById('generateBtn');
        const loader = document.getElementById('genLoader');
        const textLabel = document.getElementById('genText');

        btn.disabled = true;
        loader.classList.remove('hidden');
        textLabel.innerText = "Geminiが生成中...";

        try {
            // Imagen 3 API Call (v1beta エンドポイント想定)
            const MODEL_NAME = 'imagen-3.0-generate-001';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:predict?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{ prompt: prompt }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: "1:1"
                    }
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
                console.error("Gemini Error:", data);
                showToast("生成エラー。制限等を確認してください。");
                resetGenUI();
            }
        } catch (error) {
            console.error(error);
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

    // 5. テキスト編集 & 同期
    document.getElementById('addTextBtn').addEventListener('click', () => {
        const text = new fabric.IText('Text Here', {
            left: 200, top: 200, fontFamily: 'Inter',
            fill: '#ffffff', fontSize: 120, fontWeight: '900',
            cornerColor: '#10B981', transparentCorners: false
        });
        canvas.add(text).setActiveObject(text);
    });

    // 選択時にパネルの値を反映
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

    // パネルからオブジェクトへ反映
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

    // 6. レイヤー・削除操作
    document.getElementById('bringForward').onclick = () => { const o = canvas.getActiveObject(); if(o){ canvas.bringForward(o); canvas.renderAll(); } };
    document.getElementById('sendBackward').onclick = () => { const o = canvas.getActiveObject(); if(o){ canvas.sendBackwards(o); canvas.renderAll(); } };
    document.getElementById('deleteObj').onclick = () => { const o = canvas.getActiveObject(); if(o){ canvas.remove(o); canvas.discardActiveObject(); canvas.renderAll(); } };

    // 7. スタンプ (絵文字)
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

    // 8. フィルタ機能
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

    // 9. クロッピング (簡易実装: 70%中央切り抜き)
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

    // 10. キャンバス背景色
    document.getElementById('canvasBgColor').oninput = (e) => {
        canvas.setBackgroundColor(e.target.value, canvas.renderAll.bind(canvas));
    };

    // 11. 書き出し (高解像度 2x)
    document.getElementById('downloadBtn').onclick = () => {
        showToast("保存用データを生成中...");
        const url = canvas.toDataURL({ format: 'png', multiplier: 2 });
        const link = document.createElement('a');
        link.download = `Creative-AI-Pro-${Date.now()}.png`;
        link.href = url;
        link.click();
    };

    function showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    }
});
