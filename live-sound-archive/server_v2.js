// ============================================
// server.js v3
// 설치: npm install express multer ws cors
// 실행: node server_v2.js
// ============================================

const express = require("express");
const multer  = require("multer");
const http    = require("http");
const WebSocket = require("ws");
const cors    = require("cors");
const path    = require("path");
const fs      = require("fs");

// ========== 설정 (여기만 수정) ==========
const PORT     = 3000;
const API_KEY  = "your-secret-key";
const BASE_URL = "https://test-0083.onrender.com";
const UPLOAD_DIR = path.join(__dirname, "uploads");
// ========================================

const PREFIX = ["법","혜","선","지","묘","대","청","원","진","광","정","인","명","화","덕","승","연","보","자","무"];
const SUFFIX = ["음","광","현","수","성","진","원","화","연","명","심","선","도","운","천","지","해","봉","일","공"];
function randomDJName() {
  return `DJ ${PREFIX[Math.floor(Math.random()*PREFIX.length)]}${SUFFIX[Math.floor(Math.random()*SUFFIX.length)]}`;
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}
function formatSize(bytes) {
  return bytes > 1024*1024 ? (bytes/1024/1024).toFixed(1)+" MB" : (bytes/1024).toFixed(0)+" KB";
}

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(UPLOAD_DIR));

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
  limits: { fileSize: 500*1024*1024 },
  fileFilter: (req, file, cb) => {
    cb(null, [".wav",".mp3",".aif",".aiff",".flac"].includes(path.extname(file.originalname).toLowerCase()));
  }
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}
wss.on("connection", ws => {
  ws.send(JSON.stringify({ type: "init", cards: loadCards() }));
});

const CARDS_DB = path.join(__dirname, "cards.json");
function loadCards() {
  try { return JSON.parse(fs.readFileSync(CARDS_DB, "utf8")); } catch { return []; }
}
function saveCard(card) {
  const cards = loadCards();
  cards.unshift(card);
  fs.writeFileSync(CARDS_DB, JSON.stringify(cards, null, 2));
}

// ── 카드 뷰 (URL 파라미터 방식, 파일 생성 없음) ──
app.get("/card", (req, res) => {
  const cards = loadCards();
  const card  = cards.find(c => c.id === req.query.id);
  if (!card) return res.status(404).send("<body style='background:#000;color:#fff;padding:40px;font-family:monospace'>카드를 찾을 수 없습니다</body>");

  const THEMES = [["#ff2d78","#00f5ff"],["#00f5ff","#ffe600"],["#ffe600","#ff2d78"],["#39ff14","#ff2d78"],["#bf5fff","#00f5ff"]];
  const [accent, accent2] = THEMES[(card.cardNumber-1) % THEMES.length];
  const cardUrl = `${BASE_URL}/card?id=${card.id}`;

  res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${card.djName} — DJ CARD</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Noto+Sans+KR:wght@300;400;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#06080f;--cb:#0d1117;--a:${accent};--a2:${accent2};--t:#f0f0f0;--m:#445;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--t);font-family:'Space Mono',monospace;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:32px 20px 60px;overflow-x:hidden;}
body::after{content:"";position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,245,255,.01) 3px,rgba(0,245,255,.01) 4px);pointer-events:none;z-index:0;}
header{position:relative;z-index:1;text-align:center;margin-bottom:28px;}
.ttl{font-family:'Bebas Neue',sans-serif;font-size:clamp(2rem,8vw,3rem);letter-spacing:.2em;background:linear-gradient(135deg,var(--a),var(--a2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.sub{font-size:.56rem;letter-spacing:.22em;color:var(--m);margin-top:4px;}
.card-wrap{position:relative;z-index:1;width:min(340px,92vw);margin-bottom:0;}
.card-face{background:var(--cb);border-radius:14px;overflow:hidden;position:relative;display:none;}
.card-face.active{display:block;}
.bdr{position:absolute;inset:0;border-radius:14px;background:linear-gradient(135deg,var(--a),#111 40%,var(--a2) 60%,#111,var(--a));background-size:300% 300%;animation:bs 4s ease infinite;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;padding:3px;pointer-events:none;}
@keyframes bs{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.bg-txt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:7rem;color:rgba(255,255,255,.025);user-select:none;pointer-events:none;overflow:hidden;}
.top{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-start;padding:14px 16px 0;}
.num{font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--a);text-shadow:0 0 18px var(--a);line-height:1;}
.num span{display:block;font-size:.56rem;color:var(--m);font-family:'Space Mono',monospace;}
.badge{display:flex;flex-direction:column;align-items:flex-end;gap:3px;}
.live{font-size:.52rem;color:#39ff14;letter-spacing:.08em;display:flex;align-items:center;gap:3px;}
.live::before{content:"";width:5px;height:5px;border-radius:50%;background:#39ff14;animation:blink 1.5s ease-in-out infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
.sm{font-size:.48rem;color:var(--m);letter-spacing:.1em;}
.avi-area{position:relative;width:100%;height:230px;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.avi{width:145px;height:185px;background:linear-gradient(180deg,rgba(255,45,120,.14) 0%,rgba(0,245,255,.07) 100%);border-radius:50% 50% 40% 40%;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,45,120,.22);}
.grad{position:absolute;bottom:0;left:0;right:0;height:85px;background:linear-gradient(transparent,var(--cb));pointer-events:none;}
.btm{position:relative;z-index:2;padding:0 16px 14px;}
.dj-lbl{font-size:.52rem;letter-spacing:.2em;color:var(--a);text-transform:uppercase;margin-bottom:2px;}
.dj-nm{font-family:'Bebas Neue',sans-serif;font-size:2.7rem;line-height:.9;color:#fff;text-shadow:3px 3px 0 var(--a),-1px -1px 0 var(--a2);margin-bottom:8px;word-break:break-word;}
.ftr{display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,.08);padding-top:8px;}
.ftr-dt{font-size:.52rem;color:var(--m);line-height:1.6;}
.ftr-dt strong{display:block;font-family:'Bebas Neue',sans-serif;font-size:.9rem;color:var(--a2);letter-spacing:.08em;}
.logo-box{width:34px;height:34px;border:1px solid var(--a);border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:.54rem;color:var(--a);text-align:center;line-height:1.2;}
.tape{position:absolute;bottom:92px;left:-7px;width:70px;height:18px;background:rgba(255,255,255,.1);transform:rotate(-3deg);border-radius:2px;}
.tape.r{left:auto;right:-7px;transform:rotate(2deg);}
.tab-btn{display:block;width:100%;padding:11px;background:transparent;border:1px solid rgba(255,255,255,.1);border-top:none;border-radius:0 0 10px 10px;color:rgba(255,255,255,.35);font-family:'Space Mono',monospace;font-size:.6rem;letter-spacing:.12em;cursor:pointer;text-align:center;transition:all .2s;}
.tab-btn:hover{border-color:var(--a);color:var(--a);}
.bk-hdr{padding:14px 16px 11px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center;}
.bk-ttl{font-family:'Bebas Neue',sans-serif;font-size:.92rem;letter-spacing:.15em;color:var(--a2);}
.bk-nm{font-family:'Bebas Neue',sans-serif;font-size:1.35rem;line-height:1;}
.info{padding:10px 16px;display:flex;flex-direction:column;gap:8px;}
.row{display:flex;gap:8px;}
.lbl{font-size:.52rem;letter-spacing:.14em;color:var(--m);text-transform:uppercase;width:48px;flex-shrink:0;padding-top:2px;}
.val{font-size:.72rem;color:var(--t);word-break:break-all;}
.val.hi{color:var(--a2);}
.aud{padding:10px 16px;border-top:1px solid rgba(255,255,255,.08);}
.aud-lbl{font-size:.5rem;letter-spacing:.16em;color:var(--m);margin-bottom:8px;text-transform:uppercase;}
.player{display:flex;align-items:center;gap:10px;}
.pbtn{width:42px;height:42px;border-radius:50%;border:2px solid var(--a);background:transparent;color:var(--a);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;-webkit-tap-highlight-color:transparent;}
.pbtn:active{background:var(--a);color:#000;}
.pw{flex:1;}
.progbar{height:4px;background:rgba(255,255,255,.12);border-radius:2px;cursor:pointer;}
.pf{height:100%;width:0%;background:linear-gradient(90deg,var(--a),var(--a2));border-radius:2px;transition:width .1s;pointer-events:none;}
.pt{display:flex;justify-content:space-between;font-size:.52rem;color:var(--m);margin-top:4px;}
.qr-section{padding:16px;border-top:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;align-items:center;gap:10px;}
.qr-wrap{background:#fff;padding:10px;border-radius:10px;box-shadow:0 0 24px rgba(0,245,255,.18);}
.qr-hint{font-size:.6rem;color:var(--m);letter-spacing:.08em;text-align:center;}
.qr-url{font-size:.5rem;color:var(--a);word-break:break-all;text-align:center;}
</style>
</head>
<body>
<header>
  <div class="ttl">DJ CARD</div>
  <div class="sub">LIVE SOUND ARCHIVE — #${card.id.slice(-4).toUpperCase()}</div>
</header>

<div class="card-wrap">
  <div class="card-face active" id="front">
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
    <div class="avi-area">
      <div class="avi">
        <svg width="74" height="74" viewBox="0 0 74 74" fill="none">
          <circle cx="37" cy="25" r="16" fill="rgba(255,255,255,0.11)"/>
          <path d="M10 66 C10 48 64 48 64 66" fill="rgba(255,255,255,0.07)"/>
          <path d="M21 25 C21 13 53 13 53 25" stroke="rgba(255,255,255,0.34)" stroke-width="2.5" fill="none"/>
          <rect x="15" y="23" width="9" height="12" rx="4.5" fill="rgba(255,255,255,0.22)"/>
          <rect x="50" y="23" width="9" height="12" rx="4.5" fill="rgba(255,255,255,0.22)"/>
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
        <div class="logo-box">LIVE<br>ARC</div>
      </div>
    </div>
  </div>

  <div class="card-face" id="back">
    <div class="bdr" style="background:linear-gradient(135deg,${accent2},#111 40%,${accent} 60%,#111,${accent2});background-size:300% 300%;animation:bs 4s ease infinite;"></div>
    <div class="bk-hdr">
      <div>
        <div class="bk-ttl">TRACK INFO</div>
        <div class="bk-nm">${card.djName}</div>
      </div>
      <div style="font-size:.48rem;color:var(--m);text-align:right;line-height:1.8">NO.${String(card.cardNumber).padStart(2,"0")}<br>COLLECTOR</div>
    </div>
    <div class="info">
      <div class="row"><div class="lbl">TRACK</div><div class="val hi">${card.trackName}</div></div>
      <div class="row"><div class="lbl">형식</div><div class="val">${card.ext.toUpperCase()}</div></div>
      <div class="row"><div class="lbl">크기</div><div class="val">${formatSize(card.size)}</div></div>
      <div class="row"><div class="lbl">녹음</div><div class="val">${new Date(card.createdAt).toLocaleString("ko-KR")}</div></div>
    </div>
    <div class="aud">
      <div class="aud-lbl">▶ PLAY TRACK</div>
      <div class="player">
        <button class="pbtn" id="playbtn" onclick="tp()">
          <svg id="pico" width="14" height="16" viewBox="0 0 14 16"><polygon points="0,0 14,8 0,16" fill="currentColor"/></svg>
        </button>
        <div class="pw">
          <div class="progbar" id="pgb" onclick="sk(event)"><div class="pf" id="pgf"></div></div>
          <div class="pt"><span id="ct">0:00</span><span id="dt">--:--</span></div>
        </div>
      </div>
      <audio id="au" src="/uploads/${card.filename}" preload="metadata"></audio>
    </div>
    <div class="qr-section">
      <div class="qr-wrap" id="qrbox"></div>
      <div class="qr-hint">📱 QR 스캔하면 이 카드가 열려요</div>
      <div class="qr-url">${cardUrl}</div>
    </div>
  </div>

  <button class="tab-btn" id="tabBtn" onclick="switchFace()">TRACK INFO &amp; PLAY ↓</button>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
var showing='front';
function switchFace(){
  var f=document.getElementById('front'),b=document.getElementById('back'),btn=document.getElementById('tabBtn');
  if(showing==='front'){f.classList.remove('active');b.classList.add('active');btn.textContent='← DJ CARD';showing='back';}
  else{b.classList.remove('active');f.classList.add('active');btn.textContent='TRACK INFO & PLAY ↓';showing='front';}
}
var au=document.getElementById('au'),ico=document.getElementById('pico'),pgf=document.getElementById('pgf'),ct=document.getElementById('ct'),dt=document.getElementById('dt');
function fmt(s){if(!s||isNaN(s))return'0:00';return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');}
au.addEventListener('loadedmetadata',function(){dt.textContent=fmt(au.duration);});
au.addEventListener('timeupdate',function(){if(au.duration)pgf.style.width=(au.currentTime/au.duration*100)+'%';ct.textContent=fmt(au.currentTime);});
au.addEventListener('ended',function(){ico.innerHTML='<polygon points="0,0 14,8 0,16" fill="currentColor"/>';pgf.style.width='0%';});
function tp(){
  if(au.paused){au.play();ico.innerHTML='<rect x="0" y="0" width="4" height="16" fill="currentColor"/><rect x="8" y="0" width="4" height="16" fill="currentColor"/>';}
  else{au.pause();ico.innerHTML='<polygon points="0,0 14,8 0,16" fill="currentColor"/>';}
}
function sk(e){var r=document.getElementById('pgb').getBoundingClientRect();au.currentTime=((e.clientX-r.left)/r.width)*au.duration;}
window.addEventListener('load',function(){
  try{new QRCode(document.getElementById('qrbox'),{text:'${cardUrl}',width:180,height:180,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});}catch(e){}
});
</script>
</body>
</html>`);
});

// 업로드
app.post("/upload", (req, res) => {
  if (req.headers["x-api-key"] !== API_KEY) return res.status(401).json({ error: "인증 실패" });
  upload.single("audio")(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "파일 없음" });
    const cards = loadCards();
    const id    = genId();
    const ext   = path.extname(req.file.originalname).slice(1);
    const trackName = path.basename(req.file.originalname, path.extname(req.file.originalname)).replace(/^\d+_/,"").replace(/_/g," ");
    const card = {
      id, cardNumber: cards.length+1,
      djName: randomDJName(), trackName,
      filename: req.file.filename,
      ext, size: req.file.size,
      createdAt: Date.now(),
      cardUrl: `${BASE_URL}/card?id=${id}`
    };
    saveCard(card);
    broadcast({ type:"new_card", card });
    console.log("🎵 "+card.djName+" — "+trackName);
    res.json({ ok:true, card });
  });
});

app.get("/cards-list", (req, res) => res.json(loadCards()));

server.listen(PORT, () => console.log("🚀 http://localhost:"+PORT));
