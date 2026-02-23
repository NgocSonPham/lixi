<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Hái Lộc Đầu Xuân - Mở Bao Lì Xì</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #8b0000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            touch-action: none; /* Ngăn chặn cuộn trang trên mobile */
        }
        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
        #ui-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }
        #message-box {
            background: rgba(255, 255, 255, 0.95);
            border: 4px solid #FFD700;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            transform: scale(0);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            pointer-events: auto;
            max-width: 80%;
        }
        #message-box.show {
            transform: scale(1);
            opacity: 1;
        }
        .title-text {
            color: #D32F2F;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
        }
        .prize-text {
            color: #B8860B;
            font-size: 36px;
            font-weight: 900;
            margin-bottom: 20px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        .btn-continue {
            background: linear-gradient(to bottom, #FFD700, #FFA500);
            border: none;
            padding: 12px 30px;
            font-size: 18px;
            font-weight: bold;
            color: #D32F2F;
            border-radius: 25px;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            transition: transform 0.2s, background 0.2s;
        }
        .btn-continue:hover {
            transform: scale(1.05);
            background: linear-gradient(to bottom, #FFE4B5, #FFD700);
        }
        .btn-continue:active {
            transform: scale(0.95);
        }
        
        #instruction {
            position: absolute;
            top: 20px;
            width: 100%;
            text-align: center;
            color: #FFD700;
            font-size: 20px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.6);
            pointer-events: none;
            z-index: 5;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(1); opacity: 0.8; }
        }
    </style>
</head>
<body>

    <div id="instruction">Chạm vào một bao lì xì để mở!</div>

    <canvas id="gameCanvas"></canvas>

    <div id="ui-layer">
        <div id="message-box">
            <div class="title-text" id="msg-title">Chúc Mừng Năm Mới</div>
            <div class="prize-text" id="msg-prize">100.000 VNĐ</div>
            <button class="btn-continue" id="btn-continue">Nhận Lộc & Chơi Tiếp</button>
        </div>
    </div>

<script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // UI Elements
    const messageBox = document.getElementById('message-box');
    const msgTitle = document.getElementById('msg-title');
    const msgPrize = document.getElementById('msg-prize');
    const btnContinue = document.getElementById('btn-continue');
    const instruction = document.getElementById('instruction');

    // Cấu hình trò chơi
    let width, height;
    let envelopes = [];
    let petals = [];
    let particles = [];
    let gameState = 'PLAYING'; // PLAYING, FOCUSING, OPENING, REVEALED
    let focusedEnvelope = null;

    // Danh sách phần thưởng
    const prizes = [
        { title: "Lộc Đầu Năm", text: "50.000 VNĐ" },
        { title: "Phát Tài Phát Lộc", text: "100.000 VNĐ" },
        { title: "Đại Cát Đại Lợi", text: "200.000 VNĐ" },
        { title: "Vạn Sự Như Ý", text: "500.000 VNĐ" },
        { title: "Chúc Mừng", text: "1 Bao Lì Xì Rỗng :(" },
        { title: "Sức Khoẻ Dồi Dào", text: "Năm Mới Bình An" },
        { title: "Tiền Vào Như Nước", text: "999.999 VNĐ" }
    ];

    // Resize canvas
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }
    window.addEventListener('resize', resize);
    resize();

    // Lớp Cánh hoa mai (Background)
    class Petal {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height - height;
            this.size = Math.random() * 5 + 5;
            this.speedY = Math.random() * 1 + 0.5;
            this.speedX = Math.random() * 2 - 1;
            this.angle = Math.random() * Math.PI * 2;
            this.vAngle = Math.random() * 0.05 - 0.025;
        }
        update() {
            this.y += this.speedY;
            this.x += this.speedX + Math.sin(this.y * 0.01);
            this.angle += this.vAngle;

            if (this.y > height + 20) {
                this.y = -20;
                this.x = Math.random() * width;
            }
        }
        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            // Vẽ hình cánh hoa đơn giản
            ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // Lớp Hạt pháo hoa giấy (Confetti)
    class Particle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 20;
            this.vy = (Math.random() - 0.5) * 20 - 5; // Bắn lên trên nhiều hơn
            this.size = Math.random() * 8 + 4;
            this.color = ['#FFD700', '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF'][Math.floor(Math.random() * 6)];
            this.angle = Math.random() * 360;
            this.vAngle = (Math.random() - 0.5) * 10;
            this.life = 1.0;
            this.decay = Math.random() * 0.01 + 0.005;
            this.gravity = 0.5;
        }
        update() {
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;
            this.angle += this.vAngle;
            this.life -= this.decay;
        }
        draw(ctx) {
            if (this.life <= 0) return;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle * Math.PI / 180);
            ctx.globalAlpha = this.life;
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
            ctx.restore();
        }
    }

    // Hàm nội suy (Lerp) cho chuyển động mượt
    function lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    // Lớp Bao Lì Xì
    class Envelope {
        constructor() {
            this.w = 70;
            this.h = 110;
            this.reset();
            // Ban đầu cho rải rác khắp màn hình
            this.y = Math.random() * height; 
        }

        reset() {
            this.x = Math.random() * (width - this.w) + this.w/2;
            this.y = height + this.h + Math.random() * 200;
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = -Math.random() * 2 - 2;
            this.angle = (Math.random() - 0.5) * 0.5;
            this.vAngle = (Math.random() - 0.5) * 0.02;
            this.scale = 1;
            
            // Trạng thái mở
            this.flapAngle = 0; // 0 là đóng, -Math.PI là mở hoàn toàn
            this.cardY = 0; // Vị trí thiệp trượt lên
        }

        update() {
            if (gameState === 'PLAYING') {
                this.x += this.vx;
                this.y += this.vy;
                this.angle += this.vAngle;

                // Nảy lề trái/phải
                if (this.x < this.w/2 || this.x > width - this.w/2) this.vx *= -1;
                
                // Trôi lên trên cùng thì reset lại dưới đáy
                if (this.y < -this.h) {
                    this.reset();
                }
            } else if (this === focusedEnvelope) {
                // Đang tập trung vào bao này (Focusing/Opening)
                if (gameState === 'FOCUSING') {
                    // Di chuyển mượt ra giữa màn hình
                    const targetX = width / 2;
                    const targetY = height / 2;
                    this.x = lerp(this.x, targetX, 0.08);
                    this.y = lerp(this.y, targetY, 0.08);
                    this.angle = lerp(this.angle, 0, 0.08);
                    this.scale = lerp(this.scale, 2.5, 0.08); // Phóng to

                    // Chuyển sang OPENING khi gần tới đích
                    if (Math.abs(this.x - targetX) < 1 && Math.abs(this.scale - 2.5) < 0.05) {
                        gameState = 'OPENING';
                    }
                } else if (gameState === 'OPENING') {
                    // Hiệu ứng mở nắp bao lì xì
                    this.flapAngle = lerp(this.flapAngle, -Math.PI + 0.2, 0.1);
                    
                    // Nắp mở được một nửa thì rút thiệp lên
                    if (this.flapAngle < -Math.PI/2) {
                        this.cardY = lerp(this.cardY, -this.h * 0.6, 0.1);
                    }

                    // Hoàn tất mở
                    if (this.cardY < -this.h * 0.55) {
                        showPrize();
                    }
                }
            } else {
                // Các bao khác mờ đi và trôi chậm lại
                this.y += this.vy * 0.2;
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.scale(this.scale, this.scale);

            // Mờ đi nếu đang mở bao khác
            if (gameState !== 'PLAYING' && this !== focusedEnvelope) {
                ctx.globalAlpha = 0.3;
            }

            // Kích thước nửa bao để tiện tính toán
            const hw = this.w / 2;
            const hh = this.h / 2;

            // --- VẼ MẶT SAU CỦA BAO ---
            ctx.fillStyle = '#B71C1C'; // Đỏ đậm
            ctx.fillRect(-hw, -hh, this.w, this.h);

            // --- VẼ THIỆP (CARD) BÊN TRONG ---
            if (this.flapAngle < -0.1) {
                ctx.save();
                ctx.translate(0, this.cardY);
                ctx.fillStyle = '#FFF8E1';
                ctx.fillRect(-hw * 0.9, -hh * 0.9, this.w * 0.9, this.h * 0.9);
                // Viền thiệp
                ctx.strokeStyle = '#FFCA28';
                ctx.lineWidth = 2;
                ctx.strokeRect(-hw * 0.8, -hh * 0.8, this.w * 0.8, this.h * 0.8);
                
                // Chữ lộc trên thiệp (giả lập)
                if (gameState === 'OPENING') {
                    ctx.fillStyle = '#D32F2F';
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('LỘC', 0, 0);
                }
                ctx.restore();
            }

            // --- VẼ NẮP DƯỚI & HAI BÊN TRÙM LÊN ---
            ctx.fillStyle = '#D32F2F'; // Đỏ tươi
            ctx.beginPath();
            ctx.moveTo(-hw, hh);
            ctx.lineTo(hw, hh);
            ctx.lineTo(hw, -hh * 0.2);
            ctx.lineTo(0, hh * 0.3); // Điểm giữa nắp dưới
            ctx.lineTo(-hw, -hh * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#E53935';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Hai vạt bên
            ctx.fillStyle = '#C62828';
            ctx.beginPath();
            ctx.moveTo(-hw, -hh);
            ctx.lineTo(-hw, hh);
            ctx.lineTo(0, hh * 0.3);
            ctx.lineTo(-hw * 0.5, -hh);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(hw, -hh);
            ctx.lineTo(hw, hh);
            ctx.lineTo(0, hh * 0.3);
            ctx.lineTo(hw * 0.5, -hh);
            ctx.closePath();
            ctx.fill();

            // --- VẼ NẮP TRÊN CÙNG (CÓ THỂ MỞ) ---
            ctx.save();
            ctx.translate(0, -hh); // Dời tâm xoay lên mép trên
            
            // Xoay trong không gian 3D giả lập (bằng cách nén chiều Y)
            let flapScaleY = Math.cos(this.flapAngle);
            ctx.scale(1, flapScaleY);
            
            // Màu nắp (sáng hơn khi lật lên)
            ctx.fillStyle = flapScaleY > 0 ? '#D32F2F' : '#E53935'; 

            ctx.beginPath();
            ctx.moveTo(-hw, 0);
            ctx.lineTo(hw, 0);
            // Mũi nắp nhọn
            ctx.lineTo(0, this.h * 0.4); 
            ctx.closePath();
            ctx.fill();
            
            // Viền vàng trang trí trên nắp
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();

            // --- TRANG TRÍ MẶT TRƯỚC (Chỉ hiện khi nắp chưa mở hoàn toàn) ---
            if (flapScaleY > 0) {
                // Hình thoi vàng ở giữa bao
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.moveTo(0, -15);
                ctx.lineTo(15, 0);
                ctx.lineTo(0, 15);
                ctx.lineTo(-15, 0);
                ctx.closePath();
                ctx.fill();

                // Chữ Phúc (Tiếng Việt) trong hình thoi
                ctx.fillStyle = '#D32F2F';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('TẾT', 0, 0);
            }

            ctx.restore();
        }

        // Kiểm tra click
        isClicked(mx, my) {
            // Tính khoảng cách đến tâm (Đơn giản hóa thay vì check hình chữ nhật xoay)
            const dx = mx - this.x;
            const dy = my - this.y;
            return Math.sqrt(dx*dx + dy*dy) < this.w; // Bán kính click rũ rỉ
        }
    }

    // Khởi tạo đối tượng
    for (let i = 0; i < 40; i++) petals.push(new Petal());
    for (let i = 0; i < 15; i++) envelopes.push(new Envelope());

    // Logic nổ pháo hoa
    function spawnConfetti(x, y) {
        for (let i = 0; i < 100; i++) {
            particles.push(new Particle(x, y));
        }
    }

    // Hiện giải thưởng
    function showPrize() {
        if (gameState === 'REVEALED') return;
        gameState = 'REVEALED';
        
        spawnConfetti(width/2, height/2 - 50);

        // Lấy ngẫu nhiên phần thưởng
        const prize = prizes[Math.floor(Math.random() * prizes.length)];
        msgTitle.innerText = prize.title;
        msgPrize.innerText = prize.text;

        // Hiện UI
        setTimeout(() => {
            messageBox.classList.add('show');
        }, 500);
    }

    // Nút chơi tiếp
    btnContinue.addEventListener('click', () => {
        messageBox.classList.remove('show');
        
        // Reset bao đang mở
        if (focusedEnvelope) {
            focusedEnvelope.reset();
            focusedEnvelope = null;
        }
        
        // Dọn dẹp pháo hoa
        particles = [];
        
        // Chờ hiệu ứng UI thu lại rồi mới resume
        setTimeout(() => {
            gameState = 'PLAYING';
            instruction.style.display = 'block';
        }, 500);
    });

    // Tương tác chuột/touch
    function handleInteract(x, y) {
        if (gameState !== 'PLAYING') return;

        // Tìm bao lì xì bị click (ưu tiên cái vẽ sau/ở trên)
        for (let i = envelopes.length - 1; i >= 0; i--) {
            if (envelopes[i].isClicked(x, y)) {
                focusedEnvelope = envelopes[i];
                gameState = 'FOCUSING';
                instruction.style.display = 'none'; // Ẩn hướng dẫn
                break;
            }
        }
    }

    canvas.addEventListener('mousedown', (e) => {
        handleInteract(e.clientX, e.clientY);
    });

    canvas.addEventListener('touchstart', (e) => {
        // e.preventDefault(); // Ngăn cuộn màn hình
        if(e.touches.length > 0) {
            handleInteract(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, {passive: false});

    // Vòng lặp game
    function drawBackground() {
        // Gradient nền đỏ Tết
        const grad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
        grad.addColorStop(0, '#e52d27');
        grad.addColorStop(1, '#b31217');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Mặt trời / Hào quang mờ
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.translate(width/2, height/2);
        ctx.rotate(Date.now() * 0.0005);
        ctx.fillStyle = '#FFF';
        for(let i=0; i<12; i++) {
            ctx.rotate(Math.PI * 2 / 12);
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.lineTo(-50, width);
            ctx.lineTo(50, width);
            ctx.fill();
        }
        ctx.restore();
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        drawBackground();

        // Cập nhật & Vẽ Hoa mai
        petals.forEach(p => {
            p.update();
            p.draw(ctx);
        });

        // Sắp xếp lại để bao đang focus luôn vẽ sau cùng (trên cùng)
        const sortedEnvelopes = [...envelopes].sort((a, b) => {
            if (a === focusedEnvelope) return 1;
            if (b === focusedEnvelope) return -1;
            return 0;
        });

        // Cập nhật & Vẽ Bao lì xì
        sortedEnvelopes.forEach(env => {
            env.update();
            env.draw(ctx);
        });

        // Cập nhật & Vẽ Pháo hoa giấy
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw(ctx);
            if (particles[i].life <= 0) {
                particles.splice(i, 1);
            }
        }

        requestAnimationFrame(animate);
    }

    // Bắt đầu game
    animate();

</script>
</body>
</html>