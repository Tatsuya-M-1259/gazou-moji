document.addEventListener('DOMContentLoaded', () => {
    // 1. キャンバスの初期化 (Instagram正方形サイズをデフォルトに)
    const canvas = new fabric.Canvas('mainCanvas', {
        width: 800,
        height: 800,
        backgroundColor: '#1e293b'
    });

    // レスポンシブ対応のためのスケーリング（表示用）
    function resizeCanvasDisplay() {
        const container = document.getElementById('canvas-container');
        const ratio = canvas.getWidth() / canvas.getHeight();
        const containerWidth = container.parentElement.clientWidth - 100;
        const containerHeight = container.parentElement.clientHeight - 100;

        let scale;
        if (containerWidth / containerHeight > ratio) {
            scale = containerHeight / canvas.getHeight();
        } else {
            scale = containerWidth / canvas.getWidth();
        }
        
        container.style.transform = `scale(${scale})`;
    }
    window.addEventListener('resize', resizeCanvasDisplay);
    resizeCanvasDisplay();

    // 2. ツール切り替えロジック
    const toolBtns = document.querySelectorAll('.tool-btn');
    const panels = document.querySelectorAll('.panel-content');

    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            if (tool === 'upload') {
                document.getElementById('imageUpload').click();
                return;
            }

            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            panels.forEach(p => p.classList.add('hidden'));
            document.getElementById(`panel-${tool}`).classList.remove('hidden');
        });
    });

    // 3. 画像アップロード機能
    document.getElementById('imageUpload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target.result, (img) => {
                // キャンバスに合わせてリサイズ
                img.scaleToWidth(canvas.width);
                canvas.add(img);
                canvas.setActiveObject(img);
                canvas.renderAll();
            });
        };
        reader.readAsDataURL(file);
    });

    // 4. テキスト追加・編集機能
    document.getElementById('addTextBtn').addEventListener('click', () => {
        const text = new fabric.IText('ここに入力', {
            left: 100,
            top: 100,
            fontFamily: 'Inter',
            fill: '#ffffff',
            fontSize: 40
        });
        canvas.add(text);
        canvas.setActiveObject(text);
    });

    // プロパティ変更の同期
    document.getElementById('fontFamily').addEventListener('change', (e) => {
        const obj = canvas.getActiveObject();
        if (obj && obj.type === 'i-text') {
            obj.set('fontFamily', e.target.value);
            canvas.renderAll();
        }
    });

    document.getElementById('textColor').addEventListener('input', (e) => {
        const obj = canvas.getActiveObject();
        if (obj && obj.type === 'i-text') {
            obj.set('fill', e.target.value);
            canvas.renderAll();
        }
    });

    // 5. AI画像生成（インターフェースのみ実装）
    document.getElementById('generateBtn').addEventListener('click', async () => {
        const prompt = document.getElementById('aiPrompt').value;
        if (!prompt) return alert('プロンプトを入力してください');
        
        const btn = document.getElementById('generateBtn');
        btn.innerText = '生成中...';
        btn.disabled = true;

        // ここに DALL-E や Stability AI の API コールを実装
        // 今回はプレースホルダー画像を挿入
        setTimeout(() => {
            fabric.Image.fromURL(`https://source.unsplash.com/random/800x800/?${encodeURIComponent(prompt)}`, (img) => {
                img.scaleToWidth(canvas.width);
                canvas.add(img);
                canvas.renderAll();
                btn.innerText = 'AI画像を生成する';
                btn.disabled = false;
            });
        }, 2000);
    });

    // 6. ダウンロード機能
    document.getElementById('downloadBtn').addEventListener('click', () => {
        const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1.0
        });
        const link = document.createElement('a');
        link.download = 'amakusa-creative.png';
        link.href = dataURL;
        link.click();
    });

    // 削除キーで選択中のオブジェクトを削除
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const activeObj = canvas.getActiveObject();
            if (activeObj && !activeObj.isEditing) {
                canvas.remove(activeObj);
            }
        }
    });
});
