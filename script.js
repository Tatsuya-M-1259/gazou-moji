document.addEventListener('DOMContentLoaded', () => {
    // 1. キャンバス初期化 (1080x1080)
    const canvas = new fabric.Canvas('mainCanvas', {
        width: 1080,
        height: 1080,
        backgroundColor: '#0f172a',
        preserveObjectStacking: true
    });

    function resizePreview() {
        const container = document.getElementById('canvas-container');
        const parent = container.parentElement;
        const scale = Math.min((parent.clientWidth - 40) / 1080, (parent.clientHeight - 40) / 1080);
        container.style.transform = `scale(${scale})`;
    }
    window.addEventListener('resize', resizePreview);
    resizePreview();

    // 2. ツール切替
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            if (tool === 'upload') { document.getElementById('imageUpload').click(); return; }
            if (tool) {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.panel-content').forEach(p => p.classList.add('hidden'));
                const target = document.getElementById(`panel-${tool}`);
                if (target) target.classList.remove('hidden');
            }
        });
    });

    // 3. 無料画像生成 (4枚候補作成)
    const thumbnailContainer = document.getElementById('thumbnailContainer');
    const selectHint = document.getElementById('selectHint');

    document.getElementById('generateBtn').addEventListener('click', async () => {
        const prompt = document.getElementById('aiPrompt').value.trim();
        if (!prompt) return showToast("プロンプトを入力してください");

        const btn = document.getElementById('generateBtn');
        const loader = document.getElementById('genLoader');
        const textLabel = document.getElementById('genText');

        btn.disabled = true;
        loader.classList.remove('hidden');
        textLabel.innerText = "生成中...";
        thumbnailContainer.innerHTML = '';
        thumbnailContainer.classList.add('hidden');
        selectHint.classList.add('hidden');

        // 4枚の異なるシードでサムネイルを生成
        for (let i = 0; i < 4; i++) {
            const seed = Math.floor(Math.random() * 1000000) + i;
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&nologo=true&seed=${seed}`;
            
            const thumb = document.createElement('img');
            thumb.src = imageUrl;
            thumb.className = "w-full aspect-square object-cover rounded-lg border-2 border-transparent hover:border-emerald-500 cursor-pointer transition-all";
            
            thumb.onclick = () => {
                // キャンバスに選んだ画像を追加
                fabric.Image.fromURL(imageUrl, (img) => {
                    img.set({ originX: 'center', originY: 'center' });
                    img.scaleToWidth(canvas.width);
                    canvas.add(img);
                    img.center();
                    img.setCoords();
                    canvas.setActiveObject(img);
                    canvas.renderAll();
                    showToast("キャンバスに追加しました");
                }, { crossOrigin: 'anonymous' });
            };
            thumbnailContainer.appendChild(thumb);
        }

        // 表示
        setTimeout(() => {
            thumbnailContainer.classList.remove('hidden');
            selectHint.classList.remove('hidden');
            btn.disabled = false;
            loader.classList.add('hidden');
            textLabel.innerText = "無料で4枚生成する";
            showToast("4枚の候補を作成しました");
        }, 1000);
    });

    // 4. 画像アップロード
    document.getElementById('imageUpload').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target.result, (img) => {
                img.set({ originX: 'center', originY: 'center' });
                img.scaleToWidth(canvas.width * 0.8);
                canvas.add(img).center().setCoords();
                canvas.setActiveObject(img).renderAll();
                showToast("画像を読み込みました");
            });
        };
        reader.readAsDataURL(file);
    };

    // 5. テキスト編集 & 削除
    document.getElementById('addTextBtn').onclick = () => {
        const t = new fabric.IText('Text Here', { left: 540, top: 540, originX: 'center', originY: 'center', fontFamily: 'Inter', fill: '#ffffff', fontSize: 100, fontWeight: '900' });
        canvas.add(t).setActiveObject(t).renderAll();
    };

    document.getElementById('deleteObj').onclick = () => {
        const o = canvas.getActiveObject();
        if(o){ canvas.remove(o); canvas.discardActiveObject(); canvas.renderAll(); }
    };

    canvas.on('selection:created', () => document.getElementById('deleteObj').classList.remove('hidden'));
    canvas.on('selection:cleared', () => document.getElementById('deleteObj').classList.add('hidden'));

    // 全消去
    document.getElementById('clearAllBtn').onclick = () => {
        if(confirm("キャンバスをリセットしますか？")){ canvas.clear(); canvas.setBackgroundColor('#0f172a', canvas.renderAll.bind(canvas)); }
    };

    // 6. 保存 (高画質 2x)
    document.getElementById('downloadBtn').onclick = () => {
        showToast("高画質データを生成中...");
        const url = canvas.toDataURL({ format: 'png', multiplier: 2 });
        const a = document.createElement('a');
        a.download = `Amakusa-AI-${Date.now()}.png`;
        a.href = url;
        a.click();
    };

    function showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg; t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    }
});
