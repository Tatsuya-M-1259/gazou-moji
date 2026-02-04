document.addEventListener('DOMContentLoaded', () => {
    // 1. キャンバス初期化 (1080x1080 固定)
    const canvas = new fabric.Canvas('mainCanvas', {
        width: 1080,
        height: 1080,
        backgroundColor: '#0f172a',
        preserveObjectStacking: true
    });

    function resizePreview() {
        const container = document.getElementById('canvas-container');
        const parent = container.parentElement;
        const padding = 64;
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
            const target = document.getElementById(`panel-${tool}`);
            if (target) target.classList.remove('hidden');
        });
    });

    // 3. 無料画像生成 (Pollinations AI) - 修正版
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
            const seed = Math.floor(Math.random() * 1000000);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&nologo=true&seed=${seed}`;
            
            fabric.Image.fromURL(imageUrl, (img) => {
                if (!img) throw new Error("Load failed");
                
                // 画像をキャンバスサイズに合わせる
                img.set({ originX: 'center', originY: 'center' });
                img.scaleToWidth(canvas.width);
                
                // 追加して中央配置、再描画を強制
                canvas.add(img);
                img.center();
                img.setCoords();
                canvas.setActiveObject(img);
                canvas.renderAll(); // これがないと表示が遅れたり崩れたりする
                
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

    // 4. 画像アップロード - 修正版
    document.getElementById('imageUpload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target.result, (img) => {
                img.set({ originX: 'center', originY: 'center' });
                img.scaleToWidth(canvas.width * 0.8);
                canvas.add(img);
                img.center();
                img.setCoords();
                canvas.setActiveObject(img);
                canvas.renderAll();
                showToast("画像を読み込みました");
            });
        };
        reader.readAsDataURL(file);
    });

    // 5. テキスト編集 & 同期 (ロジックは維持)
    document.getElementById('addTextBtn').addEventListener('click', () => {
        const text = new fabric.IText('Text Here', {
            left: 540, top: 540, originX: 'center', originY: 'center',
            fontFamily: 'Inter', fill: '#ffffff', fontSize: 120, fontWeight: '900',
            cornerColor: '#10B981', transparentCorners: false
        });
        canvas.add(text).setActiveObject(text);
        canvas.renderAll();
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

    // レイヤー・削除・全消去
    document.getElementById('bringForward').onclick = () => { const o = canvas.getActiveObject(); if(o){ canvas.bringForward(o); canvas.renderAll(); } };
    document.getElementById('sendBackward').onclick = () => { const o = canvas.getActiveObject(); if(o){ canvas.sendBackwards(o); canvas.renderAll(); } };
    document.getElementById('deleteObj').onclick = () => { const o = canvas.getActiveObject(); if(o){ canvas.remove(o); canvas.discardActiveObject(); canvas.renderAll(); } };
    document.getElementById('clearAllBtn').onclick = () => { if(confirm("キャンバスを完全に消去しますか？")){ canvas.clear(); canvas.setBackgroundColor('#0f172a', canvas.renderAll.bind(canvas)); showToast("消去しました"); } };

    // 6. スタンプ
    const stamps = ['✨', '🔥', '👑', '💖', '📍', '🌈', '⚡', '💬', '🚀', '💯', '🎨', '📸'];
    const stampList = document.getElementById('stampList');
    stamps.forEach(s => {
        const btn = document.createElement('button');
        btn.className = "text-2xl p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all active:scale-90 shadow-inner";
        btn.innerText = s;
        btn.onclick = () => {
            const stamp = new fabric.Text(s, { fontSize: 180, originX: 'center', originY: 'center' });
            canvas.add(stamp);
            stamp.center();
            canvas.setActiveObject(stamp);
            canvas.renderAll();
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

    // 8. 高画質保存 (2倍解像度: 2160x2160 px)
    document.getElementById('downloadBtn').onclick = () => {
        showToast("高画質データを書き出し中...");
        const url = canvas.toDataURL({ format: 'png', multiplier: 2 });
        const link = document.createElement('a');
        link.download = `Creative-AI-${Date.now()}.png`;
        link.href = url;
        link.click();
    };

    function showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg; t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    }
});
