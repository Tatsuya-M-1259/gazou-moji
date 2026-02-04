document.addEventListener('DOMContentLoaded', () => {
    // 1. キャンバス初期化 (1080x1080)
    const canvas = new fabric.Canvas('mainCanvas', {
        width: 1080,
        height: 1080,
        backgroundColor: '#0f172a',
        preserveObjectStacking: true
    });

    // プレビューのレスポンシブスケール
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
            if (!tool) return;
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.panel-content').forEach(p => p.classList.add('hidden'));
            document.getElementById(`panel-${tool}`).classList.remove('hidden');
        });
    });

    // 3. 無料画像生成 (4枚同時作成)
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

        // 4枚の画像を生成
        for (let i = 0; i < 4; i++) {
            const seed = Math.floor(Math.random() * 999999) + i;
            // 日本語を安全なURL形式に変換
            const encodedPrompt = encodeURIComponent(promptInput);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&nologo=true&seed=${seed}`;
            
            const thumbWrap = document.createElement('div');
            thumbWrap.className = "thumb-item animate-pulse"; // 読み込み中のアニメーション
            
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
                thumbWrap.classList.remove('animate-pulse');
                thumbWrap.appendChild(img);
            };
            img.onerror = () => { thumbWrap.innerHTML = "<p class='text-[8px] p-2 text-red-400'>エラー</p>"; };
            
            thumbWrap.onclick = () => {
                showToast("キャンバスに展開中...");
                fabric.Image.fromURL(imageUrl, (fImg) => {
                    // キャンバスにフィットさせるロジック
                    fImg.scaleToWidth(canvas.width);
                    if (fImg.getScaledHeight() > canvas.height) {
                        fImg.scaleToHeight(canvas.height);
                    }
                    canvas.add(fImg);
                    fImg.center();
                    fImg.setCoords();
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
                img.scaleToWidth(canvas.width * 0.8);
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
            fontFamily: 'Inter', fill: '#ffffff', fontSize: 120, fontWeight: '900' 
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
        if(confirm("キャンバスを白紙に戻しますか？")){ canvas.clear(); canvas.setBackgroundColor('#0f172a', canvas.renderAll.bind(canvas)); }
    };

    // 6. 保存
    document.getElementById('downloadBtn').onclick = () => {
        showToast("画像を書き出し中...");
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
