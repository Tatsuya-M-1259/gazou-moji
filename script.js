document.addEventListener('DOMContentLoaded', () => {
    // 1. キャンバス初期化 (Instagram標準 1080x1080)
    const canvas = new fabric.Canvas('mainCanvas', {
        width: 1080,
        height: 1080,
        backgroundColor: '#0f172a',
        preserveObjectStacking: true
    });

    // プレビューのレスポンシブスケール調整
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

    // 3. 無料画像生成 (Pollinations AI)
    document.getElementById('generateBtn').addEventListener('click', async () => {
        const prompt = document.getElementById('aiPrompt').value.trim();
        if (!prompt) return showToast("プロンプトを入力してください");

        const btn = document.getElementById('generateBtn');
        const loader = document.getElementById('genLoader');
        const textLabel = document.getElementById('genText');

        btn.disabled = true;
        loader.classList.remove('hidden');
        textLabel.innerText = "生成しています...";

        try {
            // ランダムなシードを生成して多様性を確保
            const seed = Math.floor(Math.random() * 1000000);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&nologo=true&seed=${seed}`;
            
            fabric.Image.fromURL(imageUrl, (img) => {
                img.scaleToWidth(canvas.width);
                canvas.add(img).centerObject(img).setActiveObject(img);
                showToast("画像を生成しました");
                resetGenUI();
            }, { crossOrigin: 'anonymous' });
        } catch (e) {
            showToast("生成に失敗しました");
            resetGenUI();
        }

        function resetGenUI() {
            btn.disabled = false;
            loader.classList.add('hidden');
            textLabel.innerText = "無料で画像を生成する";
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

    // 5. テキスト編集と同期
    document.getElementById('addTextBtn').addEventListener('click', () => {
        const text = new fabric.IText('Text Here', {
            left: 200, top: 200, fontFamily: 'Inter',
            fill: '#ffffff', fontSize: 120, fontWeight: '900',
            cornerColor: '#10B981', transparentCorners: false
        });
        canvas.add(text).setActiveObject(text);
    });

    // 選択時にパネルと同期
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

    // レイヤー・削除操作
    document.getElementById('bringForward').onclick = () => { const o = canvas.getActiveObject(); if(o){ canvas.bringForward(o); canvas.renderAll(); } };
    document.getElementById('sendBackward').onclick = () => { const o = canvas.getActiveObject(); if(o){ canvas.sendBackwards(o); canvas.renderAll(); } };
    document.getElementById('deleteObj').onclick = () => { const o = canvas.getActiveObject(); if(o){ canvas.remove(o); canvas.discardActiveObject(); canvas.renderAll(); } };

    // 6. スタンプ (SNS向け絵文字)
    const stamps = ['✨', '🔥', '👑', '💖', '📍', '📸', '🌈', '💯', '⚡', '💬', '🚀', '🎁'];
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
        showToast("中央を切り抜きました");
    };

    // 8. 高画質保存 (2倍解像度)
    document.getElementById('downloadBtn').onclick = () => {
        showToast("保存用データを生成中...");
        const url = canvas.toDataURL({ format: 'png', multiplier: 2 });
        const link = document.createElement('a');
        link.download = `Amakusa-Creative-Free-${Date.now()}.png`;
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
