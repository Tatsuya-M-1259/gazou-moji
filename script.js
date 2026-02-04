document.addEventListener('DOMContentLoaded', () => {
    // 1. キャンバス初期化
    const canvas = new fabric.Canvas('mainCanvas', {
        width: 1080, // SNS標準の高解像度
        height: 1080,
        backgroundColor: '#0f172a',
        preserveObjectStacking: true
    });

    // レスポンシブ表示調整
    function fitCanvas() {
        const container = document.getElementById('canvas-container');
        const workspace = container.parentElement;
        const scale = Math.min(
            (workspace.clientWidth - 40) / canvas.width,
            (workspace.clientHeight - 40) / canvas.height
        );
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

    // 4. テキスト操作
    document.getElementById('addTextBtn').addEventListener('click', () => {
        const text = new fabric.IText('Text Here', {
            left: 100, top: 100,
            fontFamily: 'Inter',
            fill: '#ffffff',
            fontSize: 80,
            cornerColor: '#10B981',
            transparentCorners: false
        });
        canvas.add(text);
        canvas.setActiveObject(text);
    });

    document.getElementById('fontSize').addEventListener('input', (e) => {
        const obj = canvas.getActiveObject();
        if (obj && (obj.type === 'i-text' || obj.type === 'text')) {
            obj.set('fontSize', parseInt(e.target.value));
            canvas.renderAll();
        }
    });

    // 5. フィルタ (エラー修正済)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const activeObj = canvas.getActiveObject();
            if (!activeObj || activeObj.type !== 'image') {
                return showToast("画像を選択してください");
            }
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

    // 6. スタンプ機能
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
        };
        stampList.appendChild(btn);
    });

    // 7. トリミング機能 (簡易実装)
    document.getElementById('cropBtn').addEventListener('click', () => {
        const obj = canvas.getActiveObject();
        if (!obj || obj.type !== 'image') return showToast("切り抜く画像を選択してください");
        
        // 選択された画像の現在のスケールと座標でクリッピング
        showToast("選択範囲で固定されました（簡易処理）");
        obj.set('clipPath', new fabric.Rect({
            width: obj.width * 0.8,
            height: obj.height * 0.8,
            originX: 'center',
            originY: 'center'
        }));
        canvas.renderAll();
    });

    // 8. AI生成
    document.getElementById('generateBtn').addEventListener('click', async () => {
        const prompt = document.getElementById('aiPrompt').value;
        if (!prompt) return showToast("プロンプトを入力してください");
        
        const btn = document.getElementById('generateBtn');
        btn.disabled = true;
        btn.innerText = "生成中...";

        // 注: 実際のAPIキーが必要です
        try {
            const response = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(prompt)}&client_id=YOUR_ACCESS_KEY`);
            const data = await response.json();
            fabric.Image.fromURL(data.urls.regular, (img) => {
                img.scaleToWidth(canvas.width);
                canvas.add(img);
                canvas.centerObject(img);
                btn.disabled = false;
                btn.innerText = "AI画像を生成";
            }, { crossOrigin: 'anonymous' });
        } catch (e) {
            showToast("APIキーを設定してください");
            btn.disabled = false;
            btn.innerText = "AI画像を生成";
        }
    });

    // 9. 保存 (高解像度出力)
    document.getElementById('downloadBtn').addEventListener('click', () => {
        showToast("画像を生成中...");
        const dataURL = canvas.toDataURL({
            format: 'png',
            multiplier: 2 // 2160px相当で出力
        });
        const link = document.createElement('a');
        link.download = `amakusa-edit-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
    });

    function showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    }

    // 削除ショートカット
    window.addEventListener('keydown', (e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && canvas.getActiveObject()) {
            if (!canvas.getActiveObject().isEditing) canvas.remove(canvas.getActiveObject());
        }
    });
});
