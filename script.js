document.addEventListener('DOMContentLoaded', () => {
    // 1. キャンバスの物理サイズを 1080x1080 に固定
    const canvas = new fabric.Canvas('mainCanvas', {
        width: 1080,
        height: 1080,
        backgroundColor: '#0f172a',
        preserveObjectStacking: true
    });

    // プレビュー表示のスケーリング調整
    function resizePreview() {
        const container = document.getElementById('canvas-container');
        const wrapper = document.getElementById('canvas-wrapper');
        if (!container || !wrapper) return;
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

    // 3. 4枚画像生成
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
        textLabel.innerText = "AIが思考中...";
        thumbContainer.innerHTML = '';
        selectHint.classList.add('hidden');

        for (let i = 0; i < 4; i++) {
            const seed = Math.floor(Math.random() * 999999) + i;
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptInput)}?width=1080&height=1080&nologo=true&seed=${seed}`;
            
            const thumbItem = document.createElement('div');
            thumbItem.className = "thumb-item animate-pulse bg-slate-800";
            
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            
            img.onload = () => {
                thumbItem.classList.remove('animate-pulse');
                thumbItem.appendChild(img);
            };
            
            thumbItem.onclick = () => {
                showToast("キャンバスに展開中...");
                // 決定版: Fabric.jsへの確実な追加ロジック
                fabric.Image.fromURL(url, (fImg) => {
                    // ここで画像本来のサイズに基づいて計算
                    const canvasW = canvas.width;
                    const canvasH = canvas.height;
                    const imgW = fImg.width;
                    const imgH = fImg.height;

                    // アスペクト比を維持して最大化フィット
                    const scale = Math.min(canvasW / imgW, canvasH / imgH);
                    
                    fImg.set({
                        scaleX: scale,
                        scaleY: scale,
                        originX: 'center',
                        originY: 'center',
                        left: canvasW / 2,
                        top: canvasH / 2
                    });
                    
                    canvas.add(fImg);
                    fImg.setCoords();
                    canvas.setActiveObject(fImg);
                    canvas.renderAll();
                    showToast("追加しました");
                }, { crossOrigin: 'anonymous' });
            };
            thumbContainer.appendChild(thumbItem);
        }

        btn.disabled = false;
        loader.classList.add('hidden');
        textLabel.innerText = "無料で4枚生成する";
        selectHint.classList.remove('hidden');
    });

    // 4. 画像アップロード (ここも同じロジックで修正)
    document.getElementById('imageUpload').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target.result, (img) => {
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8;
                img.set({ 
                    scaleX: scale, scaleY: scale, 
                    originX: 'center', originY: 'center',
                    left: canvas.width / 2, top: canvas.height / 2
                });
                canvas.add(img).setActiveObject(img);
                img.setCoords();
                canvas.renderAll();
            });
        };
        reader.readAsDataURL(file);
    };

    // 5. テキスト追加
    document.getElementById('addTextBtn').onclick = () => {
        const t = new fabric.IText('Text Here', { 
            left: 540, top: 540, originX: 'center', originY: 'center',
            fontFamily: 'Inter', fill: '#ffffff', fontSize: 120, fontWeight: '900' 
        });
        canvas.add(t).setActiveObject(t).renderAll();
    };

    // 削除・全消去
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

    // 6. 保存 (高画質)
    document.getElementById('downloadBtn').onclick = () => {
        showToast("保存用データを生成中...");
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
