// --- CẤU HÌNH API GOOGLE SHEETS ---
// THAY THẾ BẰNG URL WEB APP GOOGLE APPS SCRIPT MỚI NHẤT SAU KHI DEPLOY CODE MỚI
const GOOGLE_APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbywQGbEzcmBuJejyj6jSzitXa2iq2v9mYl-BK-QlSqFGJHVMp__ne971i7fwBSfMe5y/exec";

// UI Elements & State
const introScreen = document.getElementById('intro-screen');
const nameForm = document.getElementById('name-form');
const userNameInput = document.getElementById('user-name');
const userPhoneInput = document.getElementById('user-phone');
const prizeListPreview = document.getElementById('prize-list-preview');
const loadingScreen = document.getElementById('loading-screen');
const instruction = document.getElementById('instruction');

const momoContainer = document.getElementById('momo-container');
const turnCounter = document.getElementById('turn-counter');
const currentTurnsDisplay = document.getElementById('current-turns');

const uiLayer = document.getElementById('ui-layer');
const msgTitle = document.getElementById('msg-title');
const msgPrize = document.getElementById('msg-prize');
const btnContinue = document.getElementById('btn-continue');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let currentUser = ""; // Lưu tên người chơi
let currentPhone = ""; // Lưu SĐT người chơi
let turns = 0; // Số lượt chơi còn lại

let width, height;
let envelopes = [];
let petals = [];
let particles = [];
let gameState = 'INTRO'; // INTRO, PLAYING, FOCUSING, OPENING, REVEALED
let focusedEnvelope = null;
let currentPrizeObj = null;

// Danh sách phần thưởng sẽ được tải từ Google Sheet
let prizes = [];

// --- Resize canvas ---
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// =========================================
// API GOOGLE SHEETS (DỮ LIỆU ĐỘNG)
// =========================================

// Lấy thông tin Lượt chơi và Danh sách Quà từ Sheet
async function fetchGameData(phone, name) {
    if (!GOOGLE_APP_SCRIPT_URL || GOOGLE_APP_SCRIPT_URL.includes("YOUR-APP-SCRIPT-ID")) {
        alert("Chưa cấu hình Google App Script URL.");
        return null;
    }

    try {
        const url = new URL(GOOGLE_APP_SCRIPT_URL);
        url.searchParams.append('action', 'login');
        url.searchParams.append('phone', phone);
        url.searchParams.append('name', name); // Gửi tên lên để Sheet biết tên khách

        const response = await fetch(url, { method: 'GET' });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error fetching data:", error);
        return { status: "error", message: "Có lỗi khi kết nối máy chủ. Vui lòng thử lại sau." };
    }
}

// Gửi kết quả bốc thăm lên Sheet (để trừ lượt & kho quà đã nhận)
async function claimPrizeToSheet(phone, prizeTitle, prizeText) {
    try {
        const response = await fetch(GOOGLE_APP_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'action': 'claim',
                'phone': phone,
                'prizeTitle': prizeTitle,
                'prizeText': prizeText
            })
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error claiming to Google Sheets:", error);
        return { status: "error" };
    }
}


// =========================================
// SỰ KIỆN FORM VÀ NÚT BẤM
// =========================================

nameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = userPhoneInput.value.trim();
    const name = userNameInput.value.trim();

    if (phone.length >= 9 && name.length > 0) {
        currentUser = name;
        currentPhone = phone;

        // Hiện loading
        loadingScreen.classList.remove('hidden');
        loadingScreen.classList.add('active');

        // Gọi API lên Google Sheets kiểm tra
        const data = await fetchGameData(phone, name);

        // Ẩn loading
        loadingScreen.classList.remove('active');
        loadingScreen.classList.add('hidden');

        if (data && data.status === "success" && data.turns > 0) {
            // Có lượt chơi
            turns = data.turns;
            prizes = data.inventory; // Mảng prize lấy từ Sheet

            // Cập nhật giao diện
            currentTurnsDisplay.innerText = turns;

            introScreen.classList.remove('active');
            introScreen.classList.add('hidden');

            // Hiện Counter
            turnCounter.classList.remove('hidden');

            startGame();
        } else {
            // Hết lượt hoặc có lỗi
            let msg = data ? data.message : "Bạn chưa có lượt chơi!";
            const errorMsg = document.getElementById('error-msg');
            errorMsg.innerText = msg;
            errorMsg.classList.remove('d-none');
        }
    }
});

btnContinue.addEventListener('click', () => {
    uiLayer.classList.add('hidden');
    uiLayer.classList.remove('active');

    // Reset bao đang mở
    if (focusedEnvelope) {
        focusedEnvelope.reset();
        focusedEnvelope = null;
    }

    particles = [];
    currentPrizeObj = null;

    // Kiểm tra xem còn lượt không để cho chơi tiếp hay đá ra ngoài nạp tiền
    if (turns > 0) {
        setTimeout(() => {
            gameState = 'PLAYING';
            instruction.style.display = 'block';
        }, 500);
    } else {
        // Quay về Intro nếu hết lượt
        turnCounter.classList.add('hidden');
        introScreen.classList.remove('hidden');
        introScreen.classList.add('active');

        // Tự hiện Momo
        const errorMsg = document.getElementById('error-msg');
        errorMsg.innerText = "Bạn đã đổi thưởng hết lượt chơi!";
        errorMsg.classList.remove('d-none');
        gameState = 'INTRO';
    }
});

function startGame() {
    gameState = 'PLAYING';
    instruction.style.display = 'block';

    if (petals.length === 0) {
        for (let i = 0; i < 40; i++) petals.push(new Petal());
        for (let i = 0; i < 15; i++) envelopes.push(new Envelope());
        animate();
    }
}

// =========================================
// CÁC LỚP ĐỐI TƯỢNG ĐỒ HOẠ
// =========================================

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
        if (gameState === 'INTRO') return;
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.y * 0.01);
        this.angle += this.vAngle;

        if (this.y > height + 20) {
            this.y = -20;
            this.x = Math.random() * width;
        }
    }
    draw(ctx) {
        if (gameState === 'INTRO') return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.fillStyle = '#ffbe0b';
        ctx.shadowColor = '#fb5607';
        ctx.shadowBlur = 5;

        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size / 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 25;
        this.vy = (Math.random() - 0.5) * 25 - 8;
        this.size = Math.random() * 10 + 5;
        this.color = ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff', '#00f5d4'][Math.floor(Math.random() * 6)];
        this.angle = Math.random() * 360;
        this.vAngle = (Math.random() - 0.5) * 15;
        this.life = 1.0;
        this.decay = Math.random() * 0.015 + 0.01;
        this.gravity = 0.6;
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
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.6);
        ctx.restore();
    }
}

function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

class Envelope {
    constructor() {
        this.w = 70;
        this.h = 110;
        this.reset();
        this.y = Math.random() * height;
    }

    reset() {
        this.x = Math.random() * (width - this.w) + this.w / 2;
        this.y = height + this.h + Math.random() * 200;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = -Math.random() * 2 - 2;
        this.angle = (Math.random() - 0.5) * 0.5;
        this.vAngle = (Math.random() - 0.5) * 0.02;
        this.scale = 1;

        this.flapAngle = 0;
        this.cardY = 0;
    }

    update() {
        if (gameState === 'INTRO') return;

        if (gameState === 'PLAYING') {
            this.x += this.vx;
            this.y += this.vy;
            this.angle += this.vAngle;

            if (this.x < this.w / 2 || this.x > width - this.w / 2) this.vx *= -1;

            if (this.y < -this.h) {
                this.reset();
            }
        } else if (this === focusedEnvelope) {
            if (gameState === 'FOCUSING') {
                const targetX = width / 2;
                const targetY = height / 2;
                this.x = lerp(this.x, targetX, 0.08);
                this.y = lerp(this.y, targetY, 0.08);
                this.angle = lerp(this.angle, 0, 0.08);
                this.scale = lerp(this.scale, 2.5, 0.08);

                if (Math.abs(this.x - targetX) < 1 && Math.abs(this.scale - 2.5) < 0.05) {
                    gameState = 'OPENING';
                }
            } else if (gameState === 'OPENING') {
                this.flapAngle = lerp(this.flapAngle, -Math.PI + 0.2, 0.1);

                if (this.flapAngle < -Math.PI / 2) {
                    this.cardY = lerp(this.cardY, -this.h * 0.6, 0.1);
                }

                if (this.cardY < -this.h * 0.55 && currentPrizeObj == null) {
                    processPrize();
                }
            }
        } else {
            this.y += this.vy * 0.1;
        }
    }

    draw(ctx) {
        if (gameState === 'INTRO') return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.scale(this.scale, this.scale);

        if (gameState !== 'PLAYING' && this !== focusedEnvelope) {
            ctx.globalAlpha = 0.2;
        }

        const hw = this.w / 2;
        const hh = this.h / 2;

        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;

        // MẶT SAU
        ctx.fillStyle = '#9e0000';
        ctx.fillRect(-hw, -hh, this.w, this.h);

        ctx.shadowColor = "transparent";

        // THIỆP
        if (this.flapAngle < -0.1) {
            ctx.save();
            ctx.translate(0, this.cardY);

            const gradCard = ctx.createLinearGradient(0, -hh, 0, hh);
            gradCard.addColorStop(0, '#fff3b0');
            gradCard.addColorStop(1, '#ffea00');
            ctx.fillStyle = gradCard;
            ctx.fillRect(-hw * 0.9, -hh * 0.9, this.w * 0.9, this.h * 0.9);

            ctx.strokeStyle = '#faa307';
            ctx.lineWidth = 2;
            ctx.strokeRect(-hw * 0.8, -hh * 0.8, this.w * 0.8, this.h * 0.8);

            if (gameState === 'OPENING') {
                ctx.fillStyle = '#d00000';
                ctx.font = 'bold 18px Outfit';
                ctx.textAlign = 'center';
                ctx.fillText('LỘC', 0, 5);
            }
            ctx.restore();
        }

        // NẮP DƯỚI & HAI BÊN
        ctx.fillStyle = '#dc2f02';
        ctx.beginPath();
        ctx.moveTo(-hw, hh);
        ctx.lineTo(hw, hh);
        ctx.lineTo(hw, -hh * 0.2);
        ctx.lineTo(0, hh * 0.3);
        ctx.lineTo(-hw, -hh * 0.2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#9d0208';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.fillStyle = '#ba1826';
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

        // NẮP TRÊN CÙNG
        ctx.save();
        ctx.translate(0, -hh);

        let flapScaleY = Math.cos(this.flapAngle);
        ctx.scale(1, flapScaleY);

        ctx.fillStyle = flapScaleY > 0 ? '#dc2f02' : '#9d0208';

        ctx.beginPath();
        ctx.moveTo(-hw, 0);
        ctx.lineTo(hw, 0);
        ctx.lineTo(0, this.h * 0.45);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffba08';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

        // TRANG TRÍ MẶT TRƯỚC
        if (flapScaleY > 0) {
            ctx.translate(0, -this.h * 0.15);
            ctx.rotate(45 * Math.PI / 180);
            ctx.fillStyle = '#ffba08';
            ctx.fillRect(-12, -12, 24, 24);

            ctx.rotate(-45 * Math.PI / 180);
            ctx.fillStyle = '#6a040f';
            ctx.font = 'bold 12px Outfit';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('TẾT', 0, 1);
        }

        ctx.restore();
    }

    isClicked(mx, my) {
        const dx = mx - this.x;
        const dy = my - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.w;
    }
}

// =========================================
// LOGIC HIỆN KẾT QUẢ VÀ TƯƠNG TÁC
// =========================================

function spawnConfetti(x, y) {
    for (let i = 0; i < 150; i++) {
        particles.push(new Particle(x, y));
    }
}

async function processPrize() {
    if (gameState === 'REVEALED') return;

    // An toàn: nếu api dính lỗi và prizes ko có gì, tạo fallback
    if (prizes.length === 0) {
        prizes = [{ title: "Chúc Mừng", text: "Năm mới bình an!", isWish: true }];
    }

    currentPrizeObj = prizes[Math.floor(Math.random() * prizes.length)];

    // Hiện loading gửi data
    loadingScreen.classList.remove('hidden');
    loadingScreen.classList.add('active');

    // Gửi data lên Google Sheets (Đồng thời trừ 1 lượt chơi trên sheet)
    const result = await claimPrizeToSheet(currentPhone, currentPrizeObj.title, currentPrizeObj.text);

    // Trừ lượt nội bộ trên web
    if (turns > 0) turns--;
    currentTurnsDisplay.innerText = turns;

    // Tắt loading và bắn pháo hoa
    loadingScreen.classList.remove('active');
    loadingScreen.classList.add('hidden');

    showResultUI();
}

function showResultUI() {
    gameState = 'REVEALED';
    spawnConfetti(width / 2, height / 2 - 50);

    msgTitle.innerText = currentPrizeObj.title + ", " + currentUser + "!";
    msgPrize.innerText = currentPrizeObj.text;

    setTimeout(() => {
        uiLayer.classList.remove('hidden');
        uiLayer.classList.add('active');
    }, 400);
}

function handleInteract(x, y) {
    if (gameState !== 'PLAYING') return;

    for (let i = envelopes.length - 1; i >= 0; i--) {
        if (envelopes[i].isClicked(x, y)) {
            focusedEnvelope = envelopes[i];
            gameState = 'FOCUSING';
            instruction.style.display = 'none';
            break;
        }
    }
}

canvas.addEventListener('mousedown', (e) => {
    handleInteract(e.clientX, e.clientY);
});

canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        handleInteract(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: false });

// =========================================
// VÒNG LẶP RENDER CHÍNH (CANVAS)
// =========================================

function drawBackground() {
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.translate(width / 2, height / 2);
    ctx.rotate(Date.now() * 0.0003);

    const maxDimension = Math.max(width, height) * 1.5;
    ctx.fillStyle = '#FFFFFF';

    for (let i = 0; i < 16; i++) {
        ctx.rotate(Math.PI * 2 / 16);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-maxDimension * 0.1, maxDimension);
        ctx.lineTo(maxDimension * 0.1, maxDimension);
        ctx.fill();
    }
    ctx.restore();
}

function animate() {
    drawBackground();

    petals.forEach(p => {
        p.update();
        p.draw(ctx);
    });

    if (gameState !== 'INTRO') {
        const sortedEnvelopes = [...envelopes].sort((a, b) => {
            if (a === focusedEnvelope) return 1;
            if (b === focusedEnvelope) return -1;
            return 0;
        });

        sortedEnvelopes.forEach(env => {
            env.update();
            env.draw(ctx);
        });
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    requestAnimationFrame(animate);
}

// Khởi chạy vòng lặp render nền ngay khi màn hình hiện
if (gameState === 'INTRO') {
    animate();
}
