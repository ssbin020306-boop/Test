// ============================================
// server.js v2 — DJ 카드 자동 생성 서버
// 설치: npm install express multer ws cors
// 실행: node server.js
// ============================================

const express = require("express");
const multer  = require("multer");
const http    = require("http");
const WebSocket = require("ws");
const cors    = require("cors");
const path    = require("path");
const fs      = require("fs");

// ========== 설정 (여기만 수정) ==========
const PORT    = 3000;
const API_KEY = "your-secret-key";          // watcher.py와 동일하게
const BASE_URL = "https://test-0083.onrender.com"; // 실제 서버 도메인
const UPLOAD_DIR = path.join(__dirname, "uploads");
const CARDS_DIR  = path.join(__dirname, "public", "cards");
// ========================================

// 불교 법명 DJ 이름 생성
const PREFIX = ["법","혜","선","지","묘","대","청","원","진","광","정","인","명","화","덕","승","연","보","자","무"];
const SUFFIX = ["음","광","현","수","성","진","원","화","연","명","심","선","도","운","천","지","해","봉","일","공"];
function randomDJName() {
  const p = PREFIX[Math.floor(Math.random() * PREFIX.length)];
  const s = SUFFIX[Math.floor(Math.random() * SUFFIX.length)];
  return `DJ ${p}${s}`;
}

// 고유 ID 생성
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatSize(bytes) {
  return bytes > 1024*1024
    ? (bytes/1024/1024).toFixed(1) + " MB"
    : (bytes/1024).toFixed(0) + " KB";
}

// 디렉토리 생성
[UPLOAD_DIR, CARDS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(UPLOAD_DIR));

// Multer 설정
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9가-힣_-]/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = [".wav",".mp3",".aif",".aiff",".flac"].includes(
      path.extname(file.originalname).toLowerCase()
    );
    cb(null, ok);
  }
});

// HTTP + WebSocket
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

wss.on("connection", ws => {
  console.log("🖥  클라이언트 접속");
  // 최신 카드 전송
  const cards = loadCards();
  ws.send(JSON.stringify({ type: "init", cards }));
});

// ── 카드 데이터 저장/로드 ──
const CARDS_DB = path.join(__dirname, "cards.json");

function loadCards() {
  try { return JSON.parse(fs.readFileSync(CARDS_DB, "utf8")); }
  catch { return []; }
}

function saveCard(card) {
  const cards = loadCards();
  cards.unshift(card);
  fs.writeFileSync(CARDS_DB, JSON.stringify(cards, null, 2));
  return card;
}

// ── DJ 카드 HTML 생성 ──
function generateCardHTML(card) {
  const THEMES = [
    { accent: "#ff2d78", accent2: "#00f5ff" },
    { accent: "#00f5ff", accent2: "#ffe600" },
    { accent: "#ffe600", accent2: "#ff2d78" },
    { accent: "#39ff14", accent2: "#ff2d78" },
    { accent: "#bf5fff", accent2: "#00f5ff" },
  ];
  const t = THEMES[Math.floor(Math.random() * THEMES.length)];

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta property="og:title" content="${card.djName} — DJ CARD">
<meta property="og:description" content="${card.trackName} · LIVE SOUND ARCHIVE">
<title>${card.djName} — DJ CARD</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Noto+Sans+KR:wght@300;400;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#06080f;--card-bg:#0d1117;--accent:${t.accent};--accent2:${t.accent2};--text:#f0f0f0;--muted:#445;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:'Space Mono',monospace;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:40px 20px 80px;overflow-x:hidden;}
body::after{content:"";position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,245,255,.012) 3px,rgba(0,245,255,.012) 4px);pointer-events:none;z-index:0;}
header{position:relative;z-index:1;text-align:center;margin-bottom:44px;}
.title{font-family:'Bebas Neue',sans-serif;font-size:clamp(2rem,8vw,3.5rem);letter-spacing:.2em;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.sub{font-size:.6rem;letter-spacing:.28em;color:var(--muted);margin-top:5px;}
.scene{position:relative;z-index:1;width:320px;height:500px;perspective:1200px;cursor:pointer;margin-bottom:18px;}
.scene:not(.flipped):hover .inner{transform:rotateY(6deg) scale(1.02);}
.scene.flipped .inner{transform:rotateY(180deg);}
.inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.4,0,.2,1);}
.face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:14px;overflow:hidden;background:var(--card-bg);}
.bdr{position:absolute;inset:0;border-radius:14px;background:linear-gradient(135deg,var(--accent),#111 40%,var(--accent2) 60%,#111,var(--accent));background-size:300% 300%;animation:bs 4s ease infinite;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;padding:3px;pointer-events:none;}
@keyframes bs{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.bg-txt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:7.5rem;color:rgba(255,255,255,.025);user-select:none;pointer-events:none;overflow:hidden;}
.top{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-start;padding:14px 16px 0;}
.num{font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--accent);text-shadow:0 0 18px var(--accent);line-height:1;}
.num span{display:block;font-size:.6rem;color:var(--muted);font-family:'Space Mono',monospace;}
.badge{display:flex;flex-direction:column;align-items:flex-end;gap:3px;}
.live{font-size:.55rem;color:#39ff14;letter-spacing:.08em;display:flex;align-items:center;gap:3px;}
.live::before{content:"";width:5px;height:5px;border-radius:50%;background:#39ff14;animation:blink 1.5s ease-in-out infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
.sm{font-size:.5rem;color:var(--muted);letter-spacing:.1em;}
.avatar-area{position:relative;width:100%;height:258px;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.avi{width:160px;height:200px;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 18%,transparent) 0%,color-mix(in srgb,var(--accent2) 10%,transparent) 100%);border-radius:50% 50% 40% 40%;display:flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);}
.grad{position:absolute;bottom:0;left:0;right:0;height:100px;background:linear-gradient(transparent,var(--card-bg));pointer-events:none;}
.btm{position:relative;z-index:2;padding:0 16px 12px;}
.dj-lbl{font-size:.56rem;letter-spacing:.2em;color:var(--accent);text-transform:uppercase;margin-bottom:2px;}
.dj-nm{font-family:'Bebas Neue',sans-serif;font-size:2.8rem;line-height:.9;color:#fff;text-shadow:3px 3px 0 var(--accent),-1px -1px 0 var(--accent2);margin-bottom:8px;word-break:break-word;}
.ftr{display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,.08);padding-top:8px;}
.ftr-dt{font-size:.56rem;color:var(--muted);line-height:1.6;}
.ftr-dt strong{display:block;font-family:'Bebas Neue',sans-serif;font-size:.95rem;color:var(--accent2);letter-spacing:.08em;}
.logo{width:36px;height:36px;border:1px solid var(--accent);border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:.58rem;color:var(--accent);text-align:center;line-height:1.2;}
.tape{position:absolute;bottom:100px;left:-7px;width:74px;height:20px;background:rgba(255,255,255,.1);transform:rotate(-3deg);border-radius:2px;}
.tape.r{left:auto;right:-7px;transform:rotate(2deg);}
.hint{position:absolute;bottom:10px;right:12px;font-size:.5rem;color:rgba(255,255,255,.18);letter-spacing:.08em;z-index:3;}
/* BACK */
.back{transform:rotateY(180deg);display:flex;flex-direction:column;}
.bk-hdr{padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center;}
.bk-ttl{font-family:'Bebas Neue',sans-serif;font-size:.95rem;letter-spacing:.15em;color:var(--accent2);}
.bk-nm{font-family:'Bebas Neue',sans-serif;font-size:1.4rem;line-height:1;}
.info{padding:12px 16px;flex:1;display:flex;flex-direction:column;gap:9px;}
.row{display:flex;gap:8px;}
.lbl{font-size:.56rem;letter-spacing:.16em;color:var(--muted);text-transform:uppercase;width:52px;flex-shrink:0;padding-top:2px;}
.val{font-size:.75rem;color:var(--text);word-break:break-all;}
.val.hi{color:var(--accent2);}
.aud{padding:9px 16px;border-top:1px solid rgba(255,255,255,.08);}
.aud-lbl{font-size:.54rem;letter-spacing:.16em;color:var(--muted);margin-bottom:6px;text-transform:uppercase;}
.player{display:flex;align-items:center;gap:9px;}
.pbtn{width:36px;height:36px;border-radius:50%;border:1.5px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;}
.pbtn:hover{background:var(--accent);color:#000;box-shadow:0 0 14px var(--accent);}
.pw{flex:1;}
.progbar{height:3px;background:rgba(255,255,255,.1);border-radius:2px;cursor:pointer;}
.pf{height:100%;width:0%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:2px;transition:width .1s;}
.pt{display:flex;justify-content:space-between;font-size:.54rem;color:var(--muted);margin-top:3px;}
.qrs{padding:7px 16px 12px;display:flex;align-items:center;gap:10px;border-top:1px solid rgba(255,255,255,.06);}
.qrb{width:50px;height:50px;background:#fff;border-radius:5px;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;}
.qrb img{width:46px;height:46px;}
.qrt{font-size:.56rem;color:var(--muted);line-height:1.7;}
.qru{font-size:.52rem;color:var(--accent2);word-break:break-all;margin-top:2px;}
.msg{position:relative;z-index:1;font-size:.62rem;color:var(--muted);letter-spacing:.1em;margin-bottom:0;}
</style>
</head>
<body>
<header>
  <div class="title">DJ CARD</div>
  <div class="sub">LIVE SOUND ARCHIVE — SESSION #${card.id.slice(-4).toUpperCase()}</div>
</header>

<div class="scene" id="card">
  <div class="inner">
    <div class="face front" onclick="flip()">
      <div class="bdr"></div>
      <div class="bg-txt">${card.djName.replace("DJ ","")}</div>
      <div class="top">
        <div class="num">${String(card.cardNumber).padStart(2,"0")}<span>NO.</span></div>
        <div class="badge">
          <div class="live">LIVE REC</div>
          <div class="sm">SOUND ARCHIVE</div>
          <div class="sm">${new Date(card.createdAt).getFullYear()}</div>
        </div>
      </div>
      <div class="avatar-area">
        <div class="avi">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="27" r="18" fill="rgba(255,255,255,0.12)"/>
            <path d="M10 72 C10 52 70 52 70 72" fill="rgba(255,255,255,0.08)"/>
            <path d="M22 27 C22 15 58 15 58 27" stroke="rgba(255,255,255,0.38)" stroke-width="2.5" fill="none"/>
            <rect x="16" y="25" width="10" height="13" rx="5" fill="rgba(255,255,255,0.26)"/>
            <rect x="54" y="25" width="10" height="13" rx="5" fill="rgba(255,255,255,0.26)"/>
          </svg>
        </div>
        <div class="grad"></div>
      </div>
      <div class="tape"></div><div class="tape r"></div>
      <div class="btm">
        <div class="dj-lbl">DJ NAME</div>
        <div class="dj-nm">${card.djName.replace("DJ ","")}</div>
        <div class="ftr">
          <div class="ftr-dt">
            <strong>${new Date(card.createdAt).toLocaleDateString("ko-KR",{year:"2-digit",month:"2-digit",day:"2-digit"})}</strong>
            LIVE SESSION
          </div>
          <div class="logo">LIVE<br>ARC</div>
        </div>
      </div>
      <div class="hint">TAP TO FLIP ↺</div>
    </div>

    <div class="face back">
      <div class="bdr" style="background:linear-gradient(135deg,var(--accent2),#111 40%,var(--accent) 60%,#111,var(--accent2));background-size:300% 300%;animation:bs 4s ease infinite;"></div>
      <div class="bk-hdr">
        <div>
          <div class="bk-ttl">TRACK INFO</div>
          <div class="bk-nm">${card.djName}</div>
        </div>
        <button onclick="flip()" style="background:transparent;border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.5);font-size:.6rem;letter-spacing:.1em;padding:4px 10px;cursor:pointer;border-radius:4px;font-family:'Space Mono',monospace;">↩ FLIP</button>
      </div>
      <div class="info">
        <div class="row"><div class="lbl">TRACK</div><div class="val hi">${card.trackName}</div></div>
        <div class="row"><div class="lbl">형식</div><div class="val">${card.ext.toUpperCase()}</div></div>
        <div class="row"><div class="lbl">크기</div><div class="val">${formatSize(card.size)}</div></div>
        <div class="row"><div class="lbl">녹음</div><div class="val">${new Date(card.createdAt).toLocaleString("ko-KR")}</div></div>
        <div class="row"><div class="lbl">SESSION</div><div class="val">LIVE SOUND ARCHIVE</div></div>
      </div>
      <div class="aud" onclick="event.stopPropagation()">
        <div class="aud-lbl">PLAY TRACK</div>
        <div class="player">
          <button class="pbtn" id="playbtn" onclick="tp(event)">
            <svg width="12" height="14" viewBox="0 0 12 14"><polygon points="0,0 12,7 0,14" fill="currentColor"/></svg>
          </button>
          <div class="pw">
            <div class="progbar" id="pgb" onclick="sk(event)"><div class="pf" id="pgf"></div></div>
            <div class="pt"><span id="ct">0:00</span><span id="dt">--:--</span></div>
          </div>
        </div>
        <audio id="au" src="/uploads/${card.filename}" preload="metadata"
          ontimeupdate="up()" onended="rs()" onloadedmetadata="mt()"></audio>
      </div>
      <div class="qrs" onclick="event.stopPropagation()">
        <div class="qrb" id="qrb"></div>
        <div>
          <div class="qrt">QR 스캔 → 이 카드 열림</div>
          <div class="qru" id="qru"></div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="msg">앞면 탭 → 뒤집기 · ↩ FLIP 버튼 → 앞으로</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
function flip(){document.getElementById("card").classList.toggle("flipped");}
const au=document.getElementById("au"),pb=document.getElementById("playbtn"),pgf=document.getElementById("pgf"),ct=document.getElementById("ct"),dt=document.getElementById("dt");
function fmt(s){if(!s||isNaN(s))return"0:00";return Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0");}
function mt(){dt.textContent=fmt(au.duration);}
function up(){if(au.duration)pgf.style.width=(au.currentTime/au.duration*100)+"%";ct.textContent=fmt(au.currentTime);}
function rs(){pb.innerHTML='<svg width="12" height="14" viewBox="0 0 12 14"><polygon points="0,0 12,7 0,14" fill="currentColor"/></svg>';pgf.style.width="0%";}
function tp(e){e.stopPropagation();if(au.paused){au.play();pb.innerHTML='<svg width="10" height="14" viewBox="0 0 10 14"><rect x="0" y="0" width="4" height="14" fill="currentColor"/><rect x="6" y="0" width="4" height="14" fill="currentColor"/></svg>';}else{au.pause();pb.innerHTML='<svg width="12" height="14" viewBox="0 0 12 14"><polygon points="0,0 12,7 0,14" fill="currentColor"/></svg>';}}
function sk(e){e.stopPropagation();const r=document.getElementById("pgb").getBoundingClientRect();au.currentTime=((e.clientX-r.left)/r.width)*au.duration;}
window.addEventListener("load",function(){
  const u=window.location.href;
  document.getElementById("qru").textContent=u.length>45?u.slice(0,45)+"…":u;
  try{new QRCode(document.getElementById("qrb"),{text:u,width:46,height:46,colorDark:"#000000",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});}catch(e){}
});
</script>
</body>
</html>`;
}

// ── API: 업로드 ──
app.post("/upload", (req, res) => {
  if (req.headers["x-api-key"] !== API_KEY) return res.status(401).json({ error: "인증 실패" });

  upload.single("audio")(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "파일 없음" });

    const cards    = loadCards();
    const cardNum  = cards.length + 1;
    const id       = genId();
    const djName   = randomDJName();
    const ext      = path.extname(req.file.originalname).slice(1);
    const trackName = path.basename(req.file.originalname, path.extname(req.file.originalname))
                          .replace(/^\d+_/, "").replace(/_/g, " ");

    const card = {
      id, cardNumber: cardNum, djName, trackName,
      filename: req.file.filename,
      ext, size: req.file.size,
      createdAt: Date.now(),
      cardUrl: `${BASE_URL}/cards/${id}.html`,
      audioUrl: `${BASE_URL}/uploads/${req.file.filename}`
    };

    // DJ 카드 HTML 파일 생성
    const cardHTML = generateCardHTML(card);
    fs.writeFileSync(path.join(CARDS_DIR, `${id}.html`), cardHTML, "utf8");

    saveCard(card);

    console.log(`🎵 새 카드: ${djName} — ${trackName}`);
    console.log(`🔗 URL: ${card.cardUrl}`);

    // WebSocket으로 현장 화면에 즉시 전달
    broadcast({ type: "new_card", card });

    res.json({ ok: true, card });
  });
});

// ── API: 카드 목록 ──
app.get("/cards-list", (req, res) => res.json(loadCards()));

// ── 카드 HTML 서빙 ──
app.use("/cards", express.static(CARDS_DIR));

server.listen(PORT, () => {
  console.log(`🚀 서버 실행: http://localhost:${PORT}`);
  console.log(`📁 업로드: ${UPLOAD_DIR}`);
  console.log(`🃏 카드:   ${CARDS_DIR}`);
});
