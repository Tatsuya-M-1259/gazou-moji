document.addEventListener('DOMContentLoaded', () => {
    const CANVAS_SIZE = 1080;

    // 1. キャンバスの物理サイズを1080pxに固定
    const canvas = new fabric.Canvas('mainCanvas', {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        backgroundColor: '#0f172a',
        preserveObjectStacking: true
    });

    // 画面サイズに合わせて縮小表示する（ズーム）
    function fitCanvasToScreen() {
        const frame = document.getElementById('canvas-fixed-frame');
        const parent = frame.parentElement;
        const scale = Math.min((parent.clientWidth - 40) / CANVAS_SIZE, (parent.clientHeight - 40) / CANVAS_SIZE);
        frame.style.transform = `scale(${scale})`;
    }
    window.addEventListener('resize', fitCanvasToScreen);
    fitCanvasToScreen();

    // 2. 画像の完全読み込みを保証するPromise関数
    const loadImageAsync = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    };

    // 3. 無料4枚生成
    const thumbContainer = document.getElementById('thumbnailContainer');

    document.getElementById('generateBtn').onclick = async () => {
        const prompt = document.getElementById('aiPrompt').value.trim();
        if (!prompt) return showToast("プロンプトを入力してください");

        const btn = document.getElementById('generateBtn');
        btn.disabled = true;
        document.getElementById('genLoader').classList.remove('hidden');
        thumbContainer.innerHTML = '';

        for (let i = 0; i < 4; i++) {
            const seed = Math.floor(Math.random() * 1000000);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&nologo=true&seed=${seed}`;
            
            const box = document.createElement('div');
            box.className = "thumb-box animate-pulse";
            
            // 非同期で画像をロード
            loadImageAsync(url).then(imgElement => {
                box.classList.remove('animate-pulse');
                box.appendChild(imgElement);
                
                // クリックでキャンバスに追加
                box.onclick = () => {
                    const fImg = new fabric.Image(imgElement, {
                        originX: 'center',
                        originY: 'center',
                        left: CANVAS_SIZE / 2,
                        top: CANVAS_SIZE / 2
                    });
                    
                    // キャンバスの幅(1080)に最大フィットさせる
                    const ratio = Math.min(CANVAS_SIZE / fImg.width, CANVAS_SIZE / fImg.height);
                    fImg.set({ scaleX: ratio, scaleY: ratio });
                    
                    canvas.add(fImg);
                    fImg.setCoords();
                    canvas.setActiveObject(fImg);
                    canvas.renderAll();
                    showToast("キャンバスに追加しました");
                };
            }).catch(() => {
                box.innerHTML = "<span class='text-[8px] text-red-500'>Error</span>";
            });

            thumbContainer.appendChild(box);
        }

        btn.disabled = false;
        document.getElementById('genLoader').classList.add('hidden');
    };

    // 4. 画像アップロード
    document.getElementById('imageUpload').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (f) => {
            const imgEl = await loadImageAsync(f.target.result);
            const fImg = new fabric.Image(imgEl, {
                originX: 'center', originY: 'center',
                left: CANVAS_SIZE / 2, top: CANVAS_SIZE / 2
            });
            const scale = Math.min(CANVAS_SIZE / fImg.width, CANVAS_SIZE / fImg.height) * 0.8;
            fImg.set({ scaleX: scale, scaleY: scale });
            canvas.add(fImg).center().setCoords();
            canvas.setActiveObject(fImg).renderAll();
        };
        reader.readAsDataURL(file);
    };

    // 5. テキスト・削除・全消去
    document.getElementById('addTextBtn').onclick = () => {
        const t = new fabric.IText('Text Here', {
            left: CANVAS_SIZE / 2, top: CANVAS_SIZE / 2,
            originX: 'center', originY: 'center',
            fontFamily: 'Inter', fill: '#ffffff', fontSize: 120, fontWeight: '900'
        });
        canvas.add(t).setActiveObject(t).renderAll();
    };

    document.getElementById('deleteObj').onclick = () => {
        const o = canvas.getActiveObject();
        if(o) { canvas.remove(o); canvas.discardActiveObject(); canvas.renderAll(); }
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
        showToast("保存用データを書き出し中...");
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

    // ツール切り替えロジック
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
});
