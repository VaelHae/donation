const express  = require('express');
const axios    = require('axios');
const cors     = require('cors');
const crypto   = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

// ─── CONFIG ──────────────────────────────────────────────────
const PORT           = process.env.PORT           || 3000;
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY || '4W3d1ZYWL0+qfv/iRKiW8ETnKrhtT7LZlLuMss23iW2OXPMvZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SWpSWE0yUXhXbGxYVERBcmNXWjJMMmxTUzJsWE9FVlVia3R5YUhSVU4weGFiRXgxVFhOek1qTnBWekpQV0ZCTmRpSXNJbTkzYm1WeVNXUWlPaUkxTXpZMU9Ea3dOREU0SWl3aVpYaHdJam94TnpjME16TTFPVGc1TENKcFlYUWlPakUzTnpRek16SXpPRGtzSW01aVppSTZNVGMzTkRNek1qTTRPWDAuR2pCTXBRcFNVQTFUbkdwQmdUaE81LWZ0TF9rd044d2U1U01tSTUyRDcyRGd1ZWlLZG00dU00OWY0c1FtVmZGWF9kSENiUXZncEM0LUJELXRBN01QWG0xWE1xaEhtNUN5WGtmVkd3dFBHSnNoaE13T21MbFBuWm5DSm5kTGk2N29HOXFrUG05VjZFcW8xMm9mQWNrc0xRa29aSTNKc2M4LVlLdFIyNmNBZU0wcFNudWdzQ1c0QUlTQ2JqWVRSc2ZHWDB4N0Q3YjFEbnpBMHNoLTB2UnFHeGxSbmk1WFh6alltYzBub2FMWU1iQk1lZ2tpZTkwdm1VTXVaYWlkTktGNnNsVnBSVkZDYm9aQ3pZYW1mRjB3SzdBZWdxdVFHMnh1eHVYbTAzQzdOZGZRVlNLQXpVTmlKOU9vaTlRdTZFUG5LTzhwNUtaMlBUX3lpNzJ4VDlOV0FR';
const UNIVERSE_ID    = process.env.UNIVERSE_ID    || '9926763102';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

console.log('='.repeat(60));
console.log('[CONFIG] UNIVERSE_ID    :', UNIVERSE_ID    || '❌ BELUM DISET');
console.log('[CONFIG] ROBLOX_API_KEY :', ROBLOX_API_KEY ? `✅ (${ROBLOX_API_KEY.length} chars)` : '❌ BELUM DISET');
console.log('[CONFIG] Mode           : TEXT-ONLY (instant, no upload, no delay)');
console.log('='.repeat(60));

// ─── HELPER ──────────────────────────────────────────────────
function formatRupiah(n) {
  let s = String(Math.floor(n)), r = '', c = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (c > 0 && c % 3 === 0) r = '.' + r;
    r = s[i] + r; c++;
  }
  return 'Rp ' + r;
}

function amountToWords(n) {
  if (n >= 1_000_000_000) return (n / 1e9).toFixed(1).replace('.0', '') + ' miliar rupiah';
  if (n >= 1_000_000)     return (n / 1e6).toFixed(1).replace('.0', '') + ' juta rupiah';
  if (n >= 1_000)         return Math.floor(n / 1000) + ' ribu rupiah';
  return n + ' rupiah';
}

// ─── ROBLOX: MESSAGING SERVICE ───────────────────────────────
// Kirim payload ke Roblox — instant, tidak ada upload
async function publishToRoblox(payload, topic = 'DonationNotification') {
  const message = JSON.stringify(payload);
  if (Buffer.byteLength(message, 'utf8') > 1024)
    throw new Error('Payload > 1KB MessagingService limit');

  const url  = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/${topic}`;
  const resp = await axios.post(url, { message }, {
    headers: { 'x-api-key': ROBLOX_API_KEY, 'Content-Type': 'application/json' },
    timeout: 10000,
  });
  return resp.status;
}

// ─── PROCESS DONATION ────────────────────────────────────────
// Kirim satu payload yang berisi semua info:
//   - data untuk UI notif (username, amount, message, display)
//   - ttsText untuk dibaca TTS di Roblox Studio langsung
async function processDonation(username, message, amount, isTest = false) {
  const ttsText = buildTtsText(username, amount, message);

  const payload = {
    username:  String(username).substring(0, 50),
    message:   String(message || '').substring(0, 150),
    amount,
    display:   formatRupiah(amount),
    ttsText,           // ← teks ini yang dibaca TTS di Roblox Studio
    timestamp: Date.now(),
    test:      isTest,
  };

  const code = await publishToRoblox(payload, 'DonationNotification');
  console.log(`[DONATION] ✅ sent (HTTP ${code}): ${username} | ${formatRupiah(amount)}`);
  return { success: true, instant: true };
}

function buildTtsText(username, amount, message) {
  let text = `${username} berdonasi ${amountToWords(amount)}`;
  if (message?.trim()) text += `. Pesan: ${message.trim()}`;
  return text.substring(0, 300);
}

// ─── NORMALISE BAGIBAGI ──────────────────────────────────────
function normaliseBagibagi(body) {
  return {
    username: body.donatur    || body.username || body.donor_name || body.name || 'Anonim',
    message:  body.pesan      || body.message  || body.note       || body.komentar || '',
    amount:   parseInt(body.nominal ?? body.amount ?? body.jumlah ?? body.donation_amount ?? 0, 10),
    type:     body.type       || body.jenis    || 'donation',
  };
}

// ─── DIAGNOSA ────────────────────────────────────────────────
app.get('/diagnose', async (req, res) => {
  const results = {
    config: {
      UNIVERSE_ID:    UNIVERSE_ID    ? '✅ ada' : '❌ KOSONG',
      ROBLOX_API_KEY: ROBLOX_API_KEY ? `✅ ada (${ROBLOX_API_KEY.length} chars)` : '❌ KOSONG',
      mode:           'TEXT-ONLY — TTS diproses di Roblox Studio (instant, zero delay)',
    },
  };

  // Test MessagingService
  try {
    const url = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/DiagnoseTest`;
    await axios.post(url, { message: JSON.stringify({ test: true }) }, {
      headers: { 'x-api-key': ROBLOX_API_KEY, 'Content-Type': 'application/json' },
      timeout: 8000,
    });
    results.messaging_service = '✅ OK (200)';
  } catch (e) {
    results.messaging_service = `❌ GAGAL HTTP ${e.response?.status}: ${JSON.stringify(e.response?.data || e.message)}`;
  }

  results.webhook_url = 'POST /webhook/bagibagi';
  results.note = 'Assets API tidak dipakai lagi — TTS generate di Roblox Studio, zero delay!';

  console.log('[DIAGNOSE]', JSON.stringify(results, null, 2));
  res.json(results);
});

// ─── DASHBOARD HTML ──────────────────────────────────────────
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Ryu | Donation Bridge — Instant Mode</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--gold:#FFD233;--gold2:#FF9500;--purple:#7B5EA7;--dark:#0A0A14;--dark2:#0F0F1E;--dark3:#161628;--text:#E8E4FF;--muted:#7A72A8;--green:#4ADE80;--red:#F87171;--blue:#60A5FA;--border:rgba(123,94,167,0.3)}
html,body{background:var(--dark);color:var(--text);font-family:'Syne',sans-serif;min-height:100vh}
body::after{content:'';position:fixed;inset:0;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:48px 48px;pointer-events:none;z-index:0;opacity:.15}
.wrap{position:relative;z-index:1;max-width:1020px;margin:0 auto;padding:36px 20px 80px}
header{text-align:center;margin-bottom:42px}
.badge{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--dark3),var(--dark2));border:1px solid var(--border);border-radius:100px;padding:7px 18px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--green);margin-bottom:18px;letter-spacing:.1em}
.badge::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:p 2s infinite}
@keyframes p{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}
h1{font-size:clamp(24px,5vw,46px);font-weight:800;background:linear-gradient(135deg,#fff 30%,var(--green));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px}
.sub{color:var(--muted);font-size:13px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:680px){.grid{grid-template-columns:1fr}}
.cf{grid-column:1/-1}
.card{background:linear-gradient(160deg,var(--dark3),var(--dark2));border:1px solid var(--border);border-radius:14px;padding:22px}
.ct{font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--gold);margin-bottom:14px;display:flex;align-items:center;gap:7px}
.ct::after{content:'';flex:1;height:1px;background:var(--border)}
.fi{margin-bottom:12px}
.fi label{display:block;font-size:10px;font-weight:700;letter-spacing:.08em;color:var(--muted);margin-bottom:5px;text-transform:uppercase}
.fi input,.fi textarea{width:100%;background:var(--dark);border:1px solid var(--border);border-radius:9px;padding:8px 12px;color:var(--text);font-family:'Syne',sans-serif;font-size:13px;outline:none;transition:border-color .2s;resize:none}
.fi textarea{height:60px}
.fi input:focus,.fi textarea:focus{border-color:var(--gold)}
.pre{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px}
.pb{background:var(--dark);border:1px solid var(--border);border-radius:100px;padding:4px 11px;color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:11px;cursor:pointer;transition:all .2s}
.pb:hover{border-color:var(--gold);color:var(--gold)}
.bs{width:100%;padding:11px;background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;border-radius:10px;font-family:'Syne',sans-serif;font-weight:800;font-size:14px;color:#0A0A14;cursor:pointer;transition:all .2s}
.bs:disabled{opacity:.5;cursor:not-allowed}
.bs:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 5px 20px rgba(255,149,0,.3)}
.res{margin-top:10px;padding:9px 12px;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:11px;display:none;line-height:1.5}
.res.ok{display:block;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.3);color:var(--green)}
.res.er{display:block;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3);color:var(--red)}
#log{font-family:'JetBrains Mono',monospace;font-size:11px;max-height:280px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
.le{padding:6px 9px;border-radius:6px;margin-bottom:4px;line-height:1.5;animation:fi .25s}
@keyframes fi{from{opacity:0;transform:translateY(-3px)}to{opacity:1}}
.le.ok{background:rgba(74,222,128,.07);border-left:3px solid var(--green);color:var(--green)}
.le.er{background:rgba(248,113,113,.07);border-left:3px solid var(--red);color:var(--red)}
.le.in{background:rgba(123,94,167,.1);border-left:3px solid var(--purple);color:var(--muted)}
.lt{color:var(--muted);margin-right:5px}
.dr{display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:11px}
.dr:last-child{border-bottom:none}
.dk{color:var(--muted);min-width:180px;flex-shrink:0}
.dv{color:var(--text);flex:1;word-break:break-all}
.dv.g{color:var(--green)}.dv.r{color:var(--red)}.dv.w{color:var(--gold)}
.dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:5px}
.dot.on{background:var(--green);box-shadow:0 0 6px var(--green)}
.dot.of{background:var(--red)}
.dot.ck{background:var(--gold);animation:p 1s infinite}
.st{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);flex:1}
.bsm{background:none;border:1px solid var(--border);border-radius:5px;color:var(--muted);padding:3px 9px;cursor:pointer;font-size:10px;font-family:'Syne',sans-serif;transition:all .2s}
.bsm:hover{border-color:var(--gold);color:var(--gold)}
.sp{display:inline-block;width:12px;height:12px;border:2px solid rgba(0,0,0,.25);border-top-color:#000;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:4px}
@keyframes spin{to{transform:rotate(360deg)}}
.info-box{background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.25);border-radius:10px;padding:14px 16px;margin-bottom:14px;font-size:12px;line-height:1.8;color:rgba(74,222,128,.8)}
.info-box strong{color:var(--green)}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="badge">⚡ INSTANT MODE — Zero Delay TTS</div>
    <h1>Donation Bridge</h1>
    <p class="sub">Notif + suara instant • TTS diproses langsung di Roblox Studio</p>
  </header>
  <div class="grid">

    <div class="card cf">
      <div class="ct">ℹ️ Cara kerja mode ini</div>
      <div class="info-box">
        <strong>Zero delay</strong> — server hanya kirim teks ke Roblox via MessagingService (instant).<br>
        TTS dibaca langsung di dalam game oleh script Roblox Studio, tidak ada proses upload atau moderasi.<br>
        Notif muncul dan suara bunyi <strong>pada saat yang sama</strong>.
      </div>
    </div>

    <div class="card cf">
      <div class="ct">🔍 Status <button class="bsm" style="margin-left:auto" onclick="runDiag()">↻ Cek</button></div>
      <div class="dr"><span class="dk">Server</span><span class="dv" id="dStatus">Memuat...</span></div>
      <div class="dr"><span class="dk">UNIVERSE_ID</span><span class="dv" id="dUniv">—</span></div>
      <div class="dr"><span class="dk">ROBLOX_API_KEY</span><span class="dv" id="dMsgKey">—</span></div>
      <div class="dr"><span class="dk">MessagingService</span><span class="dv" id="dMsg">—</span></div>
      <div class="dr"><span class="dk">Mode</span><span class="dv g" id="dMode">—</span></div>
      <div class="dr"><span class="dk">Webhook URL</span><span class="dv w" id="dWebhook">—</span> <button class="bsm" onclick="copyWH()">📋</button></div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:12px">
        <div class="dot ck" id="sDot"></div>
        <span class="st" id="sTxt">Mengecek...</span>
      </div>
    </div>

    <div class="card">
      <div class="ct">🧪 Test Donation</div>
      <div class="fi"><label>Username</label><input id="un" value="Xanns4"/></div>
      <div class="fi"><label>Nominal (Rp)</label><input type="number" id="am" value="50000" step="1000"/></div>
      <div class="pre">
        <button class="pb" onclick="sa(5000)">5rb</button>
        <button class="pb" onclick="sa(10000)">10rb</button>
        <button class="pb" onclick="sa(25000)">25rb</button>
        <button class="pb" onclick="sa(50000)">50rb</button>
        <button class="pb" onclick="sa(100000)">100rb</button>
        <button class="pb" onclick="sa(1000000)">1jt</button>
      </div>
      <div class="fi"><label>Pesan (opsional)</label><textarea id="ms">Semangat streamnya kak!</textarea></div>
      <button class="bs" id="sBtn" onclick="sendTest()">🚀 Submit</button>
      <div class="res" id="res"></div>
    </div>

    <div class="card">
      <div class="ct" style="justify-content:space-between"><span>📋 Logs</span><button class="bsm" onclick="cl()">Hapus</button></div>
      <div id="log"><div class="le in"><span class="lt">--:--:--</span>Siap.</div></div>
    </div>

    <div class="card cf">
      <div class="ct">⚡ Batch Test</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="bs" style="flex:1;min-width:120px" onclick="batch(3)">3 Donasi</button>
        <button class="bs" style="flex:1;min-width:120px;background:linear-gradient(135deg,#A78BFA,#7C3AED);color:#fff" onclick="batch(5)">5 Donasi</button>
        <button class="bs" style="flex:1;min-width:120px;background:linear-gradient(135deg,#F472B6,#BE185D);color:#fff" onclick="batch(10)">10 Donasi</button>
      </div>
    </div>
  </div>
</div>
<script>
const B=window.location.origin;
function sa(v){document.getElementById('am').value=v;}
function cl(){document.getElementById('log').innerHTML='';}
function fmt(n){return 'Rp '+parseInt(n).toLocaleString('id-ID');}
function copyWH(){navigator.clipboard.writeText(B+'/webhook/bagibagi');log('📋 Webhook URL copied!');}

function log(msg,t='in'){
  const l=document.getElementById('log'),tm=new Date().toLocaleTimeString('id-ID',{hour12:false});
  const e=document.createElement('div');
  e.className='le '+t;e.innerHTML='<span class="lt">'+tm+'</span>'+msg;
  l.prepend(e);while(l.children.length>80)l.lastElementChild.remove();
}

function sv(id,v,cls){const e=document.getElementById(id);if(e){e.textContent=v;e.className='dv '+(cls||'');}}

async function runDiag(){
  document.getElementById('sDot').className='dot ck';
  document.getElementById('sTxt').textContent='Mengecek...';
  try{
    const r=await fetch(B+'/diagnose');
    const d=await r.json();
    sv('dStatus','✅ Online','g');
    sv('dUniv',d.config.UNIVERSE_ID,d.config.UNIVERSE_ID.startsWith('✅')?'g':'r');
    sv('dMsgKey',d.config.ROBLOX_API_KEY,d.config.ROBLOX_API_KEY.startsWith('✅')?'g':'r');
    sv('dMsg',d.messaging_service,d.messaging_service.startsWith('✅')?'g':'r');
    sv('dMode',d.config.mode,'g');
    sv('dWebhook',B+'/webhook/bagibagi','w');
    document.getElementById('sDot').className='dot on';
    document.getElementById('sTxt').textContent='✅ Semua OK';
    if(d.messaging_service.startsWith('✅')) log('✅ MessagingService OK — siap terima donasi!','ok');
    else log('❌ MessagingService gagal: '+d.messaging_service,'er');
  }catch(e){
    document.getElementById('sDot').className='dot of';
    document.getElementById('sTxt').textContent='❌ '+e.message;
    sv('dStatus','❌ Error','r');
  }
}

async function sendDonation(un,am,ms,silent=false){
  if(!silent){const b=document.getElementById('sBtn');b.disabled=true;b.innerHTML='<span class="sp"></span>Mengirim...';}
  try{
    const r=await fetch(B+'/test-donation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:un,amount:am,message:ms})});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error||'HTTP '+r.status);
    if(!silent){const res=document.getElementById('res');res.className='res ok';res.innerHTML='⚡ Terkirim instant!';}
    log('⚡ '+un+' | '+fmt(am)+(ms?' | "'+ms+'"':''),'ok');
    return true;
  }catch(e){
    if(!silent){const res=document.getElementById('res');res.className='res er';res.innerHTML='❌ '+e.message;}
    log('❌ '+e.message,'er');return false;
  }finally{
    if(!silent){const b=document.getElementById('sBtn');b.disabled=false;b.innerHTML='🚀 Kirim Test';}
  }
}

function sendTest(){
  sendDonation(
    document.getElementById('un').value.trim()||'TestUser',
    parseInt(document.getElementById('am').value)||10000,
    document.getElementById('ms').value.trim()
  );
}

const US=['Xanns4','SakuraNight','NusantaraHero','DoraemonFan99','WarriorJakarta'];
const MSG=['Semangat streamnya kak!','Gas terus!','Auto nonton terus nih','Mantap kontennya!'];
const AM=[5000,10000,25000,50000,100000,500000];

async function batch(n){
  log('⚡ Batch '+n+'...','in');
  for(let i=0;i<n;i++){
    await sendDonation(US[~~(Math.random()*US.length)],AM[~~(Math.random()*AM.length)],MSG[~~(Math.random()*MSG.length)],true);
    await new Promise(r=>setTimeout(r,800));
  }
  log('✅ Batch '+n+' selesai!','ok');
}

runDiag();
</script>
</body>
</html>
`;

// ─── ROUTES ──────────────────────────────────────────────────
app.get('/dashboard', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(DASHBOARD_HTML);
});
app.get('/', (req, res) => res.redirect('/dashboard'));

app.get('/health', (req, res) => res.json({
  status:  'online',
  service: 'BagiBagi → Roblox Bridge — Instant Mode',
  mode:    'text-only, TTS di Roblox Studio',
  config:  { universe_id: UNIVERSE_ID || '', api_key_set: !!ROBLOX_API_KEY },
}));

app.get('/diagnose', async (req, res) => {
  const results = {
    config: {
      UNIVERSE_ID:    UNIVERSE_ID    ? '✅ ada' : '❌ KOSONG',
      ROBLOX_API_KEY: ROBLOX_API_KEY ? `✅ ada (${ROBLOX_API_KEY.length} chars)` : '❌ KOSONG',
      mode: 'TEXT-ONLY — TTS diproses di Roblox Studio (instant, zero delay)',
    },
  };
  try {
    const url = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/DiagnoseTest`;
    await axios.post(url, { message: JSON.stringify({ test: true }) }, {
      headers: { 'x-api-key': ROBLOX_API_KEY, 'Content-Type': 'application/json' },
      timeout: 8000,
    });
    results.messaging_service = '✅ OK (200)';
  } catch (e) {
    results.messaging_service = `❌ GAGAL HTTP ${e.response?.status}: ${JSON.stringify(e.response?.data || e.message)}`;
  }
  results.webhook_url = '/webhook/bagibagi';
  res.json(results);
});

app.post('/webhook/bagibagi', async (req, res) => {
  try {
    if (WEBHOOK_SECRET) {
      const sig = req.headers['x-bagibagi-signature'] || req.headers['x-signature'] || '';
      const exp = crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex');
      if (sig !== `sha256=${exp}`) return res.status(401).json({ error: 'Invalid signature' });
    }
    const { username, message, amount, type } = normaliseBagibagi(req.body);
    if (type !== 'donation' && type !== 'donasi') return res.json({ skipped: true });
    if (amount <= 0) return res.status(400).json({ error: 'Nominal tidak valid' });
    res.json(await processDonation(username, message, amount, false));
  } catch (e) {
    console.error('[WEBHOOK]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/test-donation', async (req, res) => {
  try {
    const { username, message, amount } = req.body;
    if (!username || !amount) return res.status(400).json({ error: 'username & amount wajib' });
    res.json(await processDonation(username, message, parseInt(amount, 10), true));
  } catch (e) {
    console.error('[TEST]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`[SERVER] http://localhost:${PORT}/dashboard`));
