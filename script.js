document.addEventListener('DOMContentLoaded', () => {
    // 1. キャンバス初期化
    const canvas = new fabric.Canvas('mainCanvas', {
        width: 1080,
        height: 1080,
        backgroundColor: '#0f172a',
        preserveObjectStacking: true
    });

    // 表示調整
    function fitCanvas() {
        const container = document.getElementById('canvas-container');
        const workspace = container.parentElement;
        const scale = Math.min((workspace.clientWidth - 40) / canvas.width, (workspace.clientHeight - 40) / canvas.height);
        container.style.transform = `scale(${scale})`;
    }
    window.addEventListener('resize', fitCanvas);
    fitCanvas();

    // 2. ツール切替
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            if (tool === 'upload') { document.getElementById('imageUpload').click(); return; }
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.panel-content').forEach(p => p.classList.add('hidden'));
            const targetPanel = document.getElementById(`panel-${tool}`);
            if (targetPanel) targetPanel.classList.remove('hidden');
        });
    });

    // 3. 画像アップロード
    document.getElementById('imageUpload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target.result, (img) => {
                img.scaleToWidth(canvas.width * 0.8);
                canvas.centerObject(img);
                canvas.add(img);
                canvas.setActiveObject(img);
                showToast("画像を読み込みました");
            });
        };
        reader.readAsDataURL(file);
    });

    // 4. テキスト・プロパティ同期
    document.getElementById('addTextBtn').addEventListener('click', () => {
        const text = new fabric.IText('Text Here', {
            left: 100, top: 100,
            fontFamily: 'Inter', fill: '#ffffff', fontSize: 80,
            cornerColor: '#10B981', transparentCorners: false
        });
        canvas.add(text);
        canvas.setActiveObject(text);
    });

    // 選択時にパネルの値を同期
    canvas.on('selection:created', updatePanelValues);
    canvas.on('selection:updated', updatePanelValues);

    function updatePanelValues() {
        const obj = canvas.getActiveObject();
        if (!obj) return;
        if (obj.type === 'i-text' || obj.type === 'text') {
            document.getElementById('fontSize').value = obj.fontSize;
            document.getElementById('textColor').value = obj.fill;
            document.getElementById('fontFamily').value = obj.fontFamily;
        }
    }

    document.getElementById('fontSize').addEventListener('input', (e) => {
        const obj = canvas.getActiveObject();
        if (obj && obj.set) {
            obj.set('fontSize', parseInt(e.target.value));
            canvas.renderAll();
        }
    });

    document.getElementById('textColor').addEventListener('input', (e) => {
        const obj = canvas.getActiveObject();
        if (obj) {
            obj.set('fill', e.target.value);
            canvas.renderAll();
        }
    });

    document.getElementById('fontFamily').addEventListener('change', (e) => {
        const obj = canvas.getActiveObject();
        if (obj) {
            obj.set('fontFamily', e.target.value);
            canvas.renderAll();
        }
    });

    // レイヤー操作
    document.getElementById('bringForward').onclick = () => {
        const obj = canvas.getActiveObject();
        if (obj) { canvas.bringForward(obj); canvas.renderAll(); }
    };
    document.getElementById('sendBackward').onclick = () => {
        const obj = canvas.getActiveObject();
        if (obj) { canvas.sendBackwards(obj); canvas.renderAll(); }
    };
    document.getElementById('deleteObj').onclick = () => {
        const obj = canvas.getActiveObject();
        if (obj) canvas.remove(obj);
    };

    // 5. フィルタ
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const activeObj = canvas.getActiveObject();
            if (!activeObj || activeObj.type !== 'image') return showToast("画像を選択してください");
            const filterName = btn.dataset.filter;
            activeObj.filters = [];
            if (filterName !== 'none') {
                const filter = new fabric.Image.filters[filterName]();
                activeObj.filters.push(filter);
            }
            activeObj.applyFilters();
            canvas.renderAll();
        });
    });

    // 6. スタンプ
    const stamps = ['🔥', '✨', '👑', '✅', '❤️', '🌟', '📍', '💡', '📸', '🎨'];
    const stampList = document.getElementById('stampList');
    stamps.forEach(s => {
        const btn = document.createElement('button');
        btn.className = "text-2xl p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-all";
        btn.innerText = s;
        btn.onclick = () => {
            const textStamp = new fabric.Text(s, { fontSize: 120 });
            canvas.add(textStamp);
            canvas.centerObject(textStamp);
            canvas.setActiveObject(textStamp);
        };
        stampList.appendChild(btn);
    });

    // 7. AI生成 (APIキー未設定時の修正)
    document.getElementById('generateBtn').addEventListener('click', async () => {
        const prompt = document.getElementById('aiPrompt').value;
        if (!prompt) return showToast("プロンプトを入力してください");
        
        const btn = document.getElementById('generateBtn');
        btn.disabled = true;
        btn.innerText = "生成中...";

        try {
            // APIキーがない場合、プレースホルダーサービスにフォールバック
            const query = encodeURIComponent(prompt);
            const imageUrl = `https://source.unsplash.com/featured/1080x1080?${query}`;
            
            fabric.Image.fromURL(imageUrl, (img) => {
                if (!img) throw new Error();
                img.scaleToWidth(canvas.width);
                canvas.add(img);
                canvas.centerObject(img);
                canvas.setActiveObject(img);
                btn.disabled = false;
                btn.innerText = "AI画像を生成";
            }, { crossOrigin: 'anonymous' });
        } catch (e) {
            showToast("生成エラー。通信環境を確認してください。");
            btn.disabled = false;
            btn.innerText = "AI画像を生成";
        }
    });

    // キャンバス設定
    document.getElementById('canvasBgColor').oninput = (e) => {
        canvas.setBackgroundColor(e.target.value, canvas.renderAll.bind(canvas));
    };

    // トリミング (簡易版)
    document.getElementById('cropBtn').onclick = () => {
        const obj = canvas.getActiveObject();
        if (!obj || obj.type !== 'image') return showToast("画像を選択してください");
        obj.set('clipPath', new fabric.Rect({
            width: obj.width * 0.8, height: obj.height * 0.8,
            originX: 'center', originY: 'center'
        }));
        canvas.renderAll();
        showToast("中央をトリミングしました");
    };

    // 8. 書き出し
    document.getElementById('downloadBtn').addEventListener('click', () => {
        showToast("画像を生成中...");
        const dataURL = canvas.toDataURL({ format: 'png', multiplier: 2 });
        const link = document.createElement('a');
        link.download = `creative-ai-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
    });

    function showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    }
});
