document.addEventListener('DOMContentLoaded', () => {
    // 1. キャンバス初期化 (1080x1080 物理サイズ)
    const canvas = new fabric.Canvas('mainCanvas', {
        width: 1080,
        height: 1080,
        backgroundColor: '#0f172a',
        preserveObjectStacking: true
    });

    // 表示用のスケーリング調整
    function resizePreview() {
        const container = document.getElementById('canvas-container');
        const wrapper = document.getElementById('canvas-wrapper');
        const scale = Math.min(
            (wrapper.clientWidth - 40) / 1080, 
            (wrapper.clientHeight - 40) / 1080
        );
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
            const target = document.getElementById(`panel-${tool}`);
            if (target) target.classList.remove('hidden');
        };
    });

    // 3. 4枚画像生成ロジック
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
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptInput)}?width=1080&height=1080&nologo=true&seed=${seed}`;
            
            const thumbItem = document.createElement('div');
            thumbItem.className = "thumb-item animate-pulse";
            
            const img = new Image();
            img.src = url;
            img.crossOrigin = "anonymous";
            
            img.onload = () => {
                thumbItem.classList.remove('animate-pulse');
                thumbItem.appendChild(img);
            };
            
            thumbItem.onclick = () => {
                showToast("キャンバスに追加中...");
                // 修正: 確実にFabric Imageとして中央に最大サイズで配置
                fabric.Image.fromURL(url, (fImg) => {
                    // 比率を保ってキャンバスにフィットさせる
                    const ratio = Math.min(canvas.width / fImg.width, canvas.height / fImg.height);
                    fImg.set({
                        scaleX: ratio,
                        scaleY: ratio,
                        originX: 'center',
                        originY: 'center'
                    });
                    canvas.add(fImg);
                    fImg.center();
                    fImg.setCoords();
                    canvas.setActiveObject(fImg);
                    canvas.renderAll();
                }, { crossOrigin: 'anonymous' });
            };
            thumbContainer.appendChild(thumbItem);
        }

        btn.disabled = false;
        loader.classList.add('hidden');
        textLabel.innerText = "無料で4枚生成する";
        selectHint.classList.remove('hidden');
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

    // 5. その他基本操作
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
        if(confirm("キャンバスを白紙に戻しますか？")){
            canvas.clear();
            canvas.setBackgroundColor('#0f172a', canvas.renderAll.bind(canvas));
        }
    };

    document.getElementById('downloadBtn').onclick = () => {
        showToast("保存用データを生成中...");
        const url = canvas.toDataURL({ format: 'png', multiplier: 2 });
        const a = document.createElement('a');
        a.download = `Amakusa-Creative-${Date.now()}.png`;
        a.href = url;
        a.click();
    };

    function showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg; t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    }
});
