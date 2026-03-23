const express = require('express');
const axios   = require('axios');
const cors    = require('cors');
const crypto  = require('crypto');
 
const app = express();
app.use(express.json());
app.use(cors());
 
// ─── CONFIG ──────────────────────────────────────────────────
const PORT           = process.env.PORT           || 3000;
const ROBLOX_API_KEY  = process.env.ROBLOX_API_KEY  || 'uggCUWnR3kOygNZW8JkDbxmEAK/z+6b79fnwc6eKY3o8pbTcZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SW5WblowTlZWMjVTTTJ0UGVXZE9XbGM0U210RVluaHRSVUZMTDNvck5tSTNPV1p1ZDJNMlpVdFpNMjg0Y0dKVVl5SXNJbTkzYm1WeVNXUWlPaUkyTXpjeE16ZzNNemtpTENKbGVIQWlPakUzTnpReU16SXhOaklzSW1saGRDSTZNVGMzTkRJeU9EVTJNaXdpYm1KbUlqb3hOemMwTWpJNE5UWXlmUS5LWFN3TGw4VmhrYjRaSDYyZWgyZUM5OXFSdzlzUi1Makt2YkhJdGw1cTVkNjhoZ1ZHTTZMYlMxbmdRR211YUZuR0pJRFg1NGM5Z2c2alU0TVFwbTBsVERFVnBCblVGNVQtZUhqVS1WaU9LQWNidGk5OXdhcDN5dzk3dnlSNDd3Sk5HLThLbzNKX2E0dFd5WW1KQ1pKU2FXckFWSmZlZi1PbXA1OUxNMzRBbF9vUVRGWWJlRjAxNURDZ2c3OU8wcDM5Y3hiRVdsMHdNVXEzYkYtbTBaOW1jazNBRU9oNkZhcnJ1eTNlQ1hVWHhXX0hUOGVDbV9lTW5oZDAtb0VXcHF5N1QwUWJVaVF6ZjkycFd1ZERISmp4SlZ6d0Q0TlFyX0xWeEpRbkg2TW8yX0JjZmhTcFhKdUJwTHZyTXctRTFaclRsMTFaaEZmLXo1SG5xZnM0b1NWWlE=';
const UNIVERSE_ID     = process.env.UNIVERSE_ID      || '9926763102';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const TOPIC          = 'DonationNotification';
// ─────────────────────────────────────────────────────────────
 
async function publishToRoblox(payload) {
  const message = JSON.stringify(payload);
  if (Buffer.byteLength(message, 'utf8') > 1024)
    throw new Error('Payload melebihi 1 KB limit Roblox MessagingService');
 
  const url = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/${TOPIC}`;
  const response = await axios.post(url, { message }, {
    headers: { 'x-api-key': ROBLOX_API_KEY, 'Content-Type': 'application/json' },
  });
  return response.status;
}
 
function normaliseBagibagi(body) {
  const username = body.donatur || body.username || body.donor_name || body.name || 'Anonim';
  const message  = body.pesan  || body.message  || body.note || body.komentar || '';
  const amount   = parseInt(body.nominal ?? body.amount ?? body.jumlah ?? body.donation_amount ?? 0, 10);
  const type     = body.type || body.jenis || 'donation';
  return { username, message, amount, type };
}
 
// ─── DASHBOARD HTML (disajikan langsung dari server) ──────────
// Dengan cara ini tidak ada CORS karena dashboard & API satu domain
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Donation Bridge — Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --gold:#FFD233;--gold2:#FF9500;--purple:#7B5EA7;
  --dark:#0A0A14;--dark2:#0F0F1E;--dark3:#161628;
  --text:#E8E4FF;--muted:#7A72A8;--green:#4ADE80;--red:#F87171;
  --border:rgba(123,94,167,0.3);
}
html,body{background:var(--dark);color:var(--text);font-family:'Syne',sans-serif;min-height:100vh}
body::before{content:'';position:fixed;inset:0;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events:none;z-index:0;opacity:.6}
body::after{content:'';position:fixed;inset:0;
  background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);
  background-size:48px 48px;pointer-events:none;z-index:0;opacity:.25}
.container{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:40px 24px 80px}
header{text-align:center;margin-bottom:52px}
.logo-badge{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,var(--dark3),var(--dark2));border:1px solid var(--border);border-radius:100px;padding:8px 20px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--gold);margin-bottom:24px;letter-spacing:.1em}
.logo-badge::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
h1{font-size:clamp(30px,5vw,52px);font-weight:800;line-height:1.05;background:linear-gradient(135deg,#fff 30%,var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:10px}
.sub{color:var(--muted);font-size:15px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:680px){.grid{grid-template-columns:1fr}}
.card-full{grid-column:1/-1}
.card{background:linear-gradient(160deg,var(--dark3),var(--dark2));border:1px solid var(--border);border-radius:16px;padding:28px;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;inset:0;border-radius:16px;background:linear-gradient(135deg,rgba(255,210,51,.04),transparent 60%);pointer-events:none}
.card-title{font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--gold);margin-bottom:20px;display:flex;align-items:center;gap:8px}
.card-title::after{content:'';flex:1;height:1px;background:var(--border)}
.field{margin-bottom:16px}
.field label{display:block;font-size:12px;font-weight:700;letter-spacing:.08em;color:var(--muted);margin-bottom:7px;text-transform:uppercase}
.field input,.field textarea{width:100%;background:var(--dark);border:1px solid var(--border);border-radius:10px;padding:11px 14px;color:var(--text);font-family:'Syne',sans-serif;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s;resize:none}
.field textarea{height:72px}
.field input:focus,.field textarea:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(255,210,51,.12)}
.presets{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.preset-btn{background:var(--dark);border:1px solid var(--border);border-radius:100px;padding:6px 14px;color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;transition:all .2s}
.preset-btn:hover{border-color:var(--gold);color:var(--gold);background:rgba(255,210,51,.06)}
.btn-send{width:100%;padding:14px;background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;border-radius:12px;font-family:'Syne',sans-serif;font-weight:800;font-size:15px;color:#0A0A14;cursor:pointer;transition:all .2s;letter-spacing:.04em}
.btn-send:disabled{opacity:.5;cursor:not-allowed}
.btn-send:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(255,149,0,.35)}
.btn-send:not(:disabled):active{transform:translateY(0)}
#result{margin-top:14px;padding:12px 16px;border-radius:10px;font-family:'JetBrains Mono',monospace;font-size:13px;display:none;line-height:1.5}
#result.success{display:block;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.3);color:var(--green)}
#result.error{display:block;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3);color:var(--red)}
#log{font-family:'JetBrains Mono',monospace;font-size:12px;max-height:280px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
.log-entry{padding:8px 12px;border-radius:8px;margin-bottom:6px;line-height:1.5;animation:fadeIn .3s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
.log-entry.ok{background:rgba(74,222,128,.07);border-left:3px solid var(--green);color:var(--green)}
.log-entry.err{background:rgba(248,113,113,.07);border-left:3px solid var(--red);color:var(--red)}
.log-entry.inf{background:rgba(123,94,167,.1);border-left:3px solid var(--purple);color:var(--muted)}
.log-time{color:var(--muted);margin-right:8px}
.info-box{background:var(--dark);border:1px solid var(--border);border-radius:10px;padding:14px 18px;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--gold);word-break:break-all;margin-bottom:14px}
.info-box .label{color:var(--muted);font-size:11px;display:block;margin-bottom:5px;text-transform:uppercase;letter-spacing:.08em}
.status-row{display:flex;align-items:center;gap:10px;margin-top:14px}
.dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.dot.online{background:var(--green);box-shadow:0 0 8px var(--green)}
.dot.offline{background:var(--red);box-shadow:0 0 8px var(--red)}
.dot.checking{background:var(--gold);animation:pulse 1s infinite}
.status-text{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);flex:1}
.btn-sm{background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);padding:5px 12px;cursor:pointer;font-size:12px;font-family:'Syne',sans-serif;transition:all .2s}
.btn-sm:hover{border-color:var(--gold);color:var(--gold)}
.spinner{display:inline-block;width:15px;height:15px;border:2px solid rgba(0,0,0,.3);border-top-color:#000;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:6px}
@keyframes spin{to{transform:rotate(360deg)}}
.copy-btn{background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);padding:3px 10px;cursor:pointer;font-size:11px;font-family:'JetBrains Mono',monospace;margin-left:8px;transition:all .2s;vertical-align:middle}
.copy-btn:hover{border-color:var(--gold);color:var(--gold)}
</style>
</head>
<body>
<div class="container">
  <header>
    <div class="logo-badge">⚡ DONATION BRIDGE — DASHBOARD</div>
    <h1>Test Donasi<br/>ke Roblox</h1>
    <p class="sub">Kirim fake donation langsung dari sini — tidak perlu setup apapun</p>
  </header>
 
  <div class="grid">
 
    <!-- STATUS -->
    <div class="card card-full">
      <div class="card-title">🌐 Info Server</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="info-box" style="margin-bottom:0">
          <span class="label">Server URL</span>
          <span id="serverUrlTxt">—</span>
        </div>
        <div class="info-box" style="margin-bottom:0">
          <span class="label">Webhook URL untuk BagiBagi</span>
          <span id="webhookUrlTxt">—</span>
          <button class="copy-btn" onclick="copyWebhook()">📋 Copy</button>
        </div>
      </div>
      <div class="status-row">
        <div class="dot checking" id="statusDot"></div>
        <span class="status-text" id="statusText">Mengecek koneksi server...</span>
        <button class="btn-sm" onclick="checkStatus()">↻ Refresh</button>
      </div>
    </div>
 
    <!-- FORM -->
    <div class="card">
      <div class="card-title">🧪 Kirim Test Donation</div>
      <div class="field">
        <label>Username Donatur</label>
        <input type="text" id="username" value="TestUser123" placeholder="Nama donatur"/>
      </div>
      <div class="field">
        <label>Nominal (Rp)</label>
        <input type="number" id="amount" value="10000" min="1000" step="1000"/>
      </div>
      <div class="presets">
        <span style="font-size:11px;color:var(--muted);align-self:center;margin-right:4px">Cepat:</span>
        <button class="preset-btn" onclick="setAmount(5000)">5rb</button>
        <button class="preset-btn" onclick="setAmount(10000)">10rb</button>
        <button class="preset-btn" onclick="setAmount(25000)">25rb</button>
        <button class="preset-btn" onclick="setAmount(50000)">50rb</button>
        <button class="preset-btn" onclick="setAmount(100000)">100rb</button>
        <button class="preset-btn" onclick="setAmount(500000)">500rb</button>
      </div>
      <div class="field">
        <label>Pesan (opsional)</label>
        <textarea id="message" placeholder="Tulis pesan donasi...">Halo! Ini donasi test 🎉</textarea>
      </div>
      <button class="btn-send" id="sendBtn" onclick="sendTestDonation()">
        🚀 Kirim ke Roblox
      </button>
      <div id="result"></div>
    </div>
 
    <!-- LOG -->
    <div class="card">
      <div class="card-title" style="justify-content:space-between">
        <span>📋 Log Aktivitas</span>
        <button onclick="clearLog()" class="btn-sm">Hapus</button>
      </div>
      <div id="log">
        <div class="log-entry inf"><span class="log-time">--:--:--</span>Dashboard dimuat, mendeteksi server...</div>
      </div>
    </div>
 
    <!-- BATCH -->
    <div class="card card-full">
      <div class="card-title">⚡ Batch Test — Spam Donasi</div>
      <p style="font-size:13px;color:var(--muted);margin-bottom:18px">Kirim beberapa donasi sekaligus untuk menguji antrian notifikasi di Roblox.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn-send" style="flex:1;min-width:150px" onclick="batchTest(3)">3 Donasi</button>
        <button class="btn-send" style="flex:1;min-width:150px;background:linear-gradient(135deg,#A78BFA,#7C3AED);color:#fff" onclick="batchTest(5)">5 Donasi</button>
        <button class="btn-send" style="flex:1;min-width:150px;background:linear-gradient(135deg,#F472B6,#BE185D);color:#fff" onclick="batchTest(10)">10 Donasi Sekaligus</button>
      </div>
    </div>
 
  </div>
</div>
<script>
  const BASE = window.location.origin;
  document.getElementById('serverUrlTxt').textContent  = BASE;
  document.getElementById('webhookUrlTxt').textContent = BASE + '/webhook/bagibagi';
 
  function setAmount(v){ document.getElementById('amount').value = v; }
  function fmt(n){ return 'Rp ' + parseInt(n).toLocaleString('id-ID'); }
 
  function copyWebhook(){
    navigator.clipboard.writeText(BASE + '/webhook/bagibagi').then(()=>{
      addLog('📋 Webhook URL disalin ke clipboard!','inf');
    });
  }
 
  function addLog(msg,type='inf'){
    const log = document.getElementById('log');
    const t   = new Date().toLocaleTimeString('id-ID',{hour12:false});
    const el  = document.createElement('div');
    el.className = 'log-entry '+type;
    el.innerHTML = '<span class="log-time">'+t+'</span>'+msg;
    log.prepend(el);
    while(log.children.length>60) log.lastElementChild.remove();
  }
  function clearLog(){ document.getElementById('log').innerHTML=''; }
 
  async function checkStatus(){
    const dot  = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    dot.className = 'dot checking';
    text.textContent = 'Mengecek...';
    try{
      const r = await fetch(BASE+'/health');
      const d = await r.json();
      dot.className = 'dot online';
      text.textContent = '✅ Server online — '+d.service;
      addLog('✅ Server OK','ok');
    }catch(e){
      dot.className = 'dot offline';
      text.textContent = '❌ Server tidak dapat dijangkau: '+e.message;
      addLog('❌ Koneksi gagal: '+e.message,'err');
    }
  }
 
  async function sendDonation(username,amount,message,silent=false){
    if(!silent){
      const btn = document.getElementById('sendBtn');
      btn.disabled=true;
      btn.innerHTML='<span class="spinner"></span>Mengirim...';
    }
    try{
      const r = await fetch(BASE+'/test-donation',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username,amount,message}),
      });
      const d = await r.json();
      if(!r.ok) throw new Error(d.error||'HTTP '+r.status);
      if(!silent){
        const res=document.getElementById('result');
        res.className='success';
        res.innerHTML='✅ Berhasil! Cek notifikasi di Roblox.<br/><small>👤 '+username+' | 💰 '+fmt(amount)+'</small>';
      }
      addLog('✅ '+username+' | '+fmt(amount)+' | "'+message+'"','ok');
      return true;
    }catch(e){
      if(!silent){
        const res=document.getElementById('result');
        res.className='error';
        res.innerHTML='❌ Gagal: '+e.message;
      }
      addLog('❌ Error: '+e.message,'err');
      return false;
    }finally{
      if(!silent){
        const btn=document.getElementById('sendBtn');
        btn.disabled=false;
        btn.innerHTML='🚀 Kirim ke Roblox';
      }
    }
  }
 
  function sendTestDonation(){
    const u=document.getElementById('username').value.trim()||'TestUser';
    const a=parseInt(document.getElementById('amount').value)||10000;
    const m=document.getElementById('message').value.trim();
    sendDonation(u,a,m);
  }
 
  const USERS=['SakuraNight','XxxProGamer','NusantaraHero','DoraemonFan99','WarriorJakarta','AnakBandung','SkylineRider','MoonlightCoder'];
  const MSGS=['Gas terus kakak! 🔥','Semangat streamnya!','W push dulu ya!','Mantap kontennya bro 💪','Gacor selalu!'];
  const AMTS=[5000,10000,15000,20000,25000,50000,100000];
 
  async function batchTest(count){
    addLog('⚡ Batch '+count+' donasi dimulai...','inf');
    for(let i=0;i<count;i++){
      const u=USERS[~~(Math.random()*USERS.length)];
      const a=AMTS[~~(Math.random()*AMTS.length)];
      const m=MSGS[~~(Math.random()*MSGS.length)];
      await sendDonation(u,a,m,true);
      await new Promise(r=>setTimeout(r,700));
    }
    addLog('✅ Batch selesai! '+count+' donasi terkirim.','ok');
  }
 
  checkStatus();
</script>
</body>
</html>`;
 
// ─── ROUTES ───────────────────────────────────────────────────
app.get('/dashboard', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(DASHBOARD_HTML);
});
 
// Root redirect ke dashboard
app.get('/', (req, res) => res.redirect('/dashboard'));
 
// Health check JSON
app.get('/health', (req, res) => res.json({
  status: 'online',
  service: 'BagiBagi \u2192 Roblox Bridge',
  endpoints: { dashboard: 'GET /dashboard', webhook: 'POST /webhook/bagibagi', test: 'POST /test-donation' },
}));
 
// ─── WEBHOOK ──────────────────────────────────────────────────
app.post('/webhook/bagibagi', async (req, res) => {
  try {
    console.log('[WEBHOOK] Incoming:', JSON.stringify(req.body));
 
    if (WEBHOOK_SECRET) {
      const sig      = req.headers['x-bagibagi-signature'] || req.headers['x-signature'] || '';
      const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex');
      if (sig !== `sha256=${expected}`) return res.status(401).json({ error: 'Invalid signature' });
    }
 
    const { username, message, amount, type } = normaliseBagibagi(req.body);
    if (type !== 'donation' && type !== 'donasi')
      return res.status(200).json({ skipped: true });
    if (amount <= 0)
      return res.status(400).json({ error: 'Nominal tidak valid' });
 
    const payload = {
      username: String(username).substring(0, 50),
      message:  String(message).substring(0, 150),
      amount,
      timestamp: Date.now(),
    };
 
    const code = await publishToRoblox(payload);
    console.log(`[WEBHOOK] OK (${code}):`, payload);
    res.status(200).json({ success: true, published: payload });
 
  } catch (err) {
    console.error('[WEBHOOK] Error:', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});
 
// ─── TEST DONATION ────────────────────────────────────────────
app.post('/test-donation', async (req, res) => {
  try {
    const { username, message, amount } = req.body;
    if (!username || !amount)
      return res.status(400).json({ error: 'username & amount wajib diisi' });
 
    const payload = {
      username: String(username).substring(0, 50),
      message:  String(message || '').substring(0, 150),
      amount:   parseInt(amount, 10),
      timestamp: Date.now(),
      test: true,
    };
 
    const code = await publishToRoblox(payload);
    console.log(`[TEST] OK (${code}):`, payload);
    res.status(200).json({ success: true, published: payload });
 
  } catch (err) {
    console.error('[TEST] Error:', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[SERVER] Running  : http://localhost:${PORT}`);
  console.log(`[SERVER] Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`[SERVER] Universe : ${UNIVERSE_ID}`);
});
