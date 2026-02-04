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
        btn.onclick = () => {
            const tool = btn.dataset.tool;
            if (tool === 'upload') { document.getElementById('imageUpload').click(); return; }
            if (!tool) return;
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.panel-content').forEach(p => p.classList.add('hidden'));
            document.getElementById(`panel-${tool}`).classList.remove('hidden');
        };
    });

    // 3. 画像生成ロジック (堅牢版)
    const thumbContainer = document.getElementById('thumbnailContainer');
    const selectHint = document.getElementById('selectHint');

    document.getElementById('generateBtn').addEventListener('click', async () => {
        const promptInput = document.getElementById('aiPrompt').value.trim();
        if (!promptInput) return showToast("プロンプトを入力してください");

        const btn = document.getElementById('generateBtn');
        const loader = document.getElementById('genLoader');
        const textLabel = document.getElementById('genText');

        btn.disabled = true;
        loader.classList.remove('hidden');
        textLabel.innerText = "生成中...";
        thumbContainer.innerHTML = '';
        selectHint.classList.add('hidden');

        for (let i = 0; i < 4; i++) {
            const seed = Math.floor(Math.random() * 999999) + i;
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptInput)}?width=1080&height=1080&nologo=true&seed=${seed}`;
            
            const thumbWrap = document.createElement('div');
            thumbWrap.className = "thumb-item animate-pulse bg-slate-800";
            
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageUrl;
            
            img.onload = () => {
                thumbWrap.classList.remove('animate-pulse');
                thumbWrap.appendChild(img);
            };
            img.onerror = () => { thumbWrap.innerHTML = "<div class='h-full flex items-center justify-center text-[8px]'>Error</div>"; };
            
            thumbWrap.onclick = () => {
                showToast("キャンバスに展開中...");
                // 修正: Fabric.jsの画像追加を確実に実行
                fabric.Image.fromURL(imageUrl, (fImg) => {
                    // 比率を保ちつつ、キャンバスの1080pxに最大フィットさせる
                    const ratio = Math.min(canvas.width / fImg.width, canvas.height / fImg.height);
                    fImg.set({
                        scaleX: ratio,
                        scaleY: ratio,
                        originX: 'center',
                        originY: 'center'
                    });
                    canvas.add(fImg);
                    fImg.center(); // 中央配置
                    fImg.setCoords(); // 操作座標の更新
                    canvas.setActiveObject(fImg);
                    canvas.renderAll();
                }, { crossOrigin: 'anonymous' });
            };
            thumbContainer.appendChild(thumbWrap);
        }

        btn.disabled = false;
        loader.classList.add('hidden');
        textLabel.innerText = "無料で4枚生成する";
        selectHint.classList.remove('hidden');
        showToast("候補を作成しました");
    });

    // 4. 画像アップロード
    document.getElementById('imageUpload').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target.result, (img) => {
                const ratio = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8;
                img.set({ scaleX: ratio, scaleY: ratio, originX: 'center', originY: 'center' });
                canvas.add(img).center().setCoords();
                canvas.setActiveObject(img).renderAll();
            });
        };
        reader.readAsDataURL(file);
    };

    // 5. テキスト編集
    document.getElementById('addTextBtn').onclick = () => {
        const t = new fabric.IText('Text Here', { 
            left: 540, top: 540, originX: 'center', originY: 'center',
            fontFamily: 'Inter', fill: '#ffffff', fontSize: 100, fontWeight: '900' 
        });
        canvas.add(t).setActiveObject(t).renderAll();
    };

    document.getElementById('deleteObj').onclick = () => {
        const o = canvas.getActiveObject();
        if(o){ canvas.remove(o); canvas.discardActiveObject(); canvas.renderAll(); }
    };

    canvas.on('selection:created', () => document.getElementById('deleteObj').classList.remove('hidden'));
    canvas.on('selection:cleared', () => document.getElementById('deleteObj').classList.add('hidden'));

    document.getElementById('clearAllBtn').onclick = () => {
        if(confirm("キャンバスを白紙に戻しますか？")){
            canvas.clear();
            canvas.setBackgroundColor('#0f172a', canvas.renderAll.bind(canvas));
        }
    };

    // 6. 保存 (高解像度)
    document.getElementById('downloadBtn').onclick = () => {
        showToast("画像を生成中...");
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
