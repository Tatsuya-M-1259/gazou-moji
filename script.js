document.addEventListener('DOMContentLoaded', () => {
    const SIZE = 1080;

    // 1. キャンバス初期化 (物理サイズを1080pxで固定)
    const canvas = new fabric.Canvas('mainCanvas', {
        width: SIZE,
        height: SIZE,
        backgroundColor: '#000',
        preserveObjectStacking: true
    });

    // ビューポートのスケール調整（画面に合わせる）
    function rescale() {
        const vp = document.getElementById('canvas-viewport');
        const parent = vp.parentElement;
        const scale = Math.min((parent.clientWidth - 64) / SIZE, (parent.clientHeight - 64) / SIZE);
        vp.style.transform = `scale(${scale})`;
    }
    window.addEventListener('resize', rescale);
    rescale();

    // 2. 画像生成 (4枚作成)
    const grid = document.getElementById('thumbGrid');
    const loader = document.getElementById('loader');

    document.getElementById('generateBtn').onclick = () => {
        const prompt = document.getElementById('aiPrompt').value.trim();
        if (!prompt) return;

        loader.classList.remove('hidden');
        grid.innerHTML = '';

        // 4枚の画像を生成して表示
        for (let i = 0; i < 4; i++) {
            const seed = Math.floor(Math.random() * 100000);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&nologo=true&seed=${seed}`;
            
            const img = new Image();
            img.src = url;
            img.className = "thumb-img";
            img.onload = () => {
                if (i === 3) loader.classList.add('hidden'); // 最後の画像が読み込まれたら消す
            };
            
            // クリックでメインキャンバスに「投影」
            img.onclick = () => {
                // 通信エラーを避けるため、すでにロード済みのimgを利用
                fabric.Image.fromURL(url, (fImg) => {
                    // キャンバス全体に広がるように調整
                    const scale = Math.max(SIZE / fImg.width, SIZE / fImg.height);
                    fImg.set({
                        scaleX: scale,
                        scaleY: scale,
                        originX: 'center',
                        originY: 'center',
                        left: SIZE / 2,
                        top: SIZE / 2,
                        selectable: true
                    });
                    canvas.add(fImg);
                    canvas.setActiveObject(fImg);
                    canvas.renderAll();
                }, { crossOrigin: 'anonymous' });
            };
            grid.appendChild(img);
        }
    };

    // 3. テキスト操作
    document.getElementById('addTextBtn').onclick = () => {
        const t = new fabric.IText('AMAKUSA', {
            left: SIZE / 2,
            top: SIZE / 2,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Noto Sans JP',
            fontWeight: '900',
            fontSize: 200,
            fill: '#fff'
        });
        canvas.add(t).setActiveObject(t).renderAll();
    };

    // 同期処理
    canvas.on('selection:created', () => document.getElementById('deleteBtn').classList.remove('hidden'));
    canvas.on('selection:cleared', () => document.getElementById('deleteBtn').classList.add('hidden'));
    
    document.getElementById('deleteBtn').onclick = () => {
        canvas.remove(canvas.getActiveObject());
        canvas.discardActiveObject().renderAll();
    };

    document.getElementById('clearAllBtn').onclick = () => {
        if(confirm("すべて消去しますか？")) {
            canvas.clear();
            canvas.setBackgroundColor('#000', canvas.renderAll.bind(canvas));
        }
    };

    // 4. 保存
    document.getElementById('downloadBtn').onclick = () => {
        const dataURL = canvas.toDataURL({ format: 'png', multiplier: 1 });
        const link = document.createElement('a');
        link.download = `Amakusa-AI-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
    };

    // ツール切り替え
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.onclick = () => {
            if (btn.id === 'clearAllBtn') return;
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.panel-content').forEach(p => p.classList.add('hidden'));
            document.getElementById(`panel-${btn.dataset.tool}`).classList.remove('hidden');
            if (btn.dataset.tool === 'upload') document.getElementById('imageUpload').click();
        };
    });
});
