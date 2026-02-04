document.addEventListener('DOMContentLoaded', () => {
    // 1. キャンバスの初期設定
    const canvas = new fabric.Canvas('mainCanvas', {
        width: 1080, // SNS解像度
        height: 1080,
        backgroundColor: '#0f172a',
        preserveObjectStacking: true
    });

    // キャンバスのリサイズ表示制御
    function resizePreview() {
        const container = document.getElementById('canvas-container');
        const parent = container.parentElement;
        const padding = 60;
        const scale = Math.min((parent.clientWidth - padding) / 1080, (parent.clientHeight - padding) / 1080);
        container.style.transform = `scale(${scale})`;
    }
    window.addEventListener('resize', resizePreview);
    resizePreview();

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

    // 3. AI画像生成 (Pollinations AI: APIキー不要)
    document.getElementById('generateBtn').addEventListener('click', async () => {
        const prompt = document.getElementById('aiPrompt').value.trim();
        if (!prompt) return showToast("プロンプトを入力してください");

        const btn = document.getElementById('generateBtn');
        const loader = document.getElementById('genLoader');
        const text = document.getElementById('genText');

        btn.disabled = true;
        loader.classList.remove('hidden');
        text.innerText = "生成しています...";

        try {
            const seed = Math.floor(Math.random() * 1000000);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&nologo=true&seed=${seed}`;
            
            fabric.Image.fromURL(imageUrl, (img) => {
                img.scaleToWidth(canvas.width);
                canvas.add(img);
                canvas.centerObject(img);
                canvas.setActiveObject(img);
                resetGenBtn();
                showToast("画像を生成しました");
            }, { crossOrigin: 'anonymous' });
        } catch (e) {
            showToast("エラーが発生しました");
            resetGenBtn();
        }

        function resetGenBtn() {
            btn.disabled = false;
            loader.classList.add('hidden');
            text.innerText = "AI画像を生成する";
        }
    });

    // 4. 画像アップロード
    document.getElementById('imageUpload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target.result, (img) => {
                img.scaleToWidth(canvas.width * 0.7);
                canvas.centerObject(img);
                canvas.add(img);
                canvas.setActiveObject(img);
                showToast("画像を読み込みました");
            });
        };
        reader.readAsDataURL(file);
    });

    // 5. テキスト編集と同期
    document.getElementById('addTextBtn').addEventListener('click', () => {
        const text = new fabric.IText('ここに入力', {
            left: 200, top: 200, fontFamily: 'Inter',
            fill: '#ffffff', fontSize: 120, fontWeight: 'bold'
        });
        canvas.add(text).setActiveObject(text);
    });

    // 選択時に削除ボタンを表示し、値をパネルに同期
    canvas.on('selection:created', onSelect);
    canvas.on('selection:updated', onSelect);
    canvas.on('selection:cleared', () => document.getElementById('deleteObj').classList.add('hidden'));

    function onSelect(e) {
        const obj = e.selected[0];
        document.getElementById('deleteObj').classList.remove('hidden');
        if (obj.type === 'i-text' || obj.type === 'text') {
            document.getElementById('fontSize').value = obj.fontSize;
            document.getElementById('textColor').value = obj.fill;
            document.getElementById('fontFamily').value = obj.fontFamily;
        }
    }

    document.getElementById('fontSize').oninput = (e) => {
        const obj = canvas.getActiveObject();
        if (obj) { obj.set('fontSize', parseInt(e.target.value)); canvas.renderAll(); }
    };
    document.getElementById('textColor').oninput = (e) => {
        const obj = canvas.getActiveObject();
        if (obj) { obj.set('fill', e.target.value); canvas.renderAll(); }
    };
    document.getElementById('fontFamily').onchange = (e) => {
        const obj = canvas.getActiveObject();
        if (obj) { obj.set('fontFamily', e.target.value); canvas.renderAll(); }
    };

    // 6. レイヤーと削除
    document.getElementById('bringForward').onclick = () => { const o = canvas.getActiveObject(); if(o){canvas.bringForward(o); canvas.renderAll();} };
    document.getElementById('sendBackward').onclick = () => { const o = canvas.getActiveObject(); if(o){canvas.sendBackwards(o); canvas.renderAll();} };
    document.getElementById('deleteObj').onclick = () => { const o = canvas.getActiveObject(); if(o){canvas.remove(o); canvas.discardActiveObject(); canvas.renderAll();} };

    // 7. スタンプ (SNS風絵文字)
    const stamps = ['✨', '🔥', '👑', '💖', '📍', '📸', '🌈', '💯', '⚡', '💬', '🚀', '🎁'];
    const stampList = document.getElementById('stampList');
    stamps.forEach(s => {
        const b = document.createElement('button');
        b.className = "text-2xl p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all active:scale-90";
        b.innerText = s;
        b.onclick = () => {
            const stamp = new fabric.Text(s, { fontSize: 150 });
            canvas.add(stamp).centerObject(stamp).setActiveObject(stamp);
        };
        stampList.appendChild(b);
    });

    // 8. フィルタ
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

    // 9. トリミング
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

    // 10. 書き出し
    document.getElementById('downloadBtn').onclick = () => {
        showToast("保存用データを生成中...");
        const url = canvas.toDataURL({ format: 'png', multiplier: 2 });
        const a = document.createElement('a');
        a.download = `Creative-AI-${Date.now()}.png`;
        a.href = url;
        a.click();
    };

    function showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg; t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    }
});
