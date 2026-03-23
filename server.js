const express  = require('express');
const axios    = require('axios');
const cors     = require('cors');
const crypto   = require('crypto');
const FormData = require('form-data');
 
const app = express();
app.use(express.json());
app.use(cors());
 
// ─── CONFIG ──────────────────────────────────────────────────
const PORT            = process.env.PORT            || 3000;
const ROBLOX_API_KEY  = process.env.ROBLOX_API_KEY  || 'uggCUWnR3kOygNZW8JkDbxmEAK/z+6b79fnwc6eKY3o8pbTcZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SW5WblowTlZWMjVTTTJ0UGVXZE9XbGM0U210RVluaHRSVUZMTDNvck5tSTNPV1p1ZDJNMlpVdFpNMjg0Y0dKVVl5SXNJbTkzYm1WeVNXUWlPaUkyTXpjeE16ZzNNemtpTENKbGVIQWlPakUzTnpReU16SXhOaklzSW1saGRDSTZNVGMzTkRJeU9EVTJNaXdpYm1KbUlqb3hOemMwTWpJNE5UWXlmUS5LWFN3TGw4VmhrYjRaSDYyZWgyZUM5OXFSdzlzUi1Makt2YkhJdGw1cTVkNjhoZ1ZHTTZMYlMxbmdRR211YUZuR0pJRFg1NGM5Z2c2alU0TVFwbTBsVERFVnBCblVGNVQtZUhqVS1WaU9LQWNidGk5OXdhcDN5dzk3dnlSNDd3Sk5HLThLbzNKX2E0dFd5WW1KQ1pKU2FXckFWSmZlZi1PbXA1OUxNMzRBbF9vUVRGWWJlRjAxNURDZ2c3OU8wcDM5Y3hiRVdsMHdNVXEzYkYtbTBaOW1jazNBRU9oNkZhcnJ1eTNlQ1hVWHhXX0hUOGVDbV9lTW5oZDAtb0VXcHF5N1QwUWJVaVF6ZjkycFd1ZERISmp4SlZ6d0Q0TlFyX0xWeEpRbkg2TW8yX0JjZmhTcFhKdUJwTHZyTXctRTFaclRsMTFaaEZmLXo1SG5xZnM0b1NWWlE=';
const UNIVERSE_ID     = process.env.UNIVERSE_ID      || '9926763102';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const ROBLOX_USER_ID  = process.env.ROBLOX_USER_ID  || '5365890418';   // ← BARU: User ID Roblox kamu
const TTS_VOICE       = process.env.TTS_VOICE       || 'Joanna';  // StreamElements voice
const TTS_ENABLED     = process.env.TTS_ENABLED !== 'false' && ROBLOX_USER_ID !== '';
// ─────────────────────────────────────────────────────────────
 
// ─── FORMAT ──────────────────────────────────────────────────
function formatRupiah(amount) {
  const s = String(Math.floor(amount));
  let result = '', counter = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (counter > 0 && counter % 3 === 0) result = '.' + result;
    result = s[i] + result;
    counter++;
  }
  return 'Rp ' + result;
}
 
// Ubah angka ke kata untuk TTS (lebih natural diucapkan)
function amountToWords(amount) {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1).replace('.0', '') + ' miliar rupiah';
  if (amount >= 1_000_000)     return (amount / 1_000_000).toFixed(1).replace('.0', '')     + ' juta rupiah';
  if (amount >= 1_000)         return Math.floor(amount / 1_000)                             + ' ribu rupiah';
  return amount + ' rupiah';
}
 
// ─── PUBLISH KE ROBLOX MESSAGING SERVICE ─────────────────────
async function publishToRoblox(payload, topic = 'DonationNotification') {
  const message = JSON.stringify(payload);
  if (Buffer.byteLength(message, 'utf8') > 1024)
    throw new Error('Payload > 1 KB limit MessagingService');
 
  const url = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/${topic}`;
  const resp = await axios.post(url, { message }, {
    headers: { 'x-api-key': ROBLOX_API_KEY, 'Content-Type': 'application/json' },
  });
  return resp.status;
}
 
// ─── TTS: GENERATE AUDIO ─────────────────────────────────────
// Pakai StreamElements TTS (gratis, tanpa API key)
// Voice options: Joanna, Matthew, Brian, Amy, Emma, Joey, Salli, dll.
async function generateTTS(text) {
  const url = `https://api.streamelements.com/kappa/v2/speech?voice=${TTS_VOICE}&text=${encodeURIComponent(text)}`;
  console.log('[TTS] Generating audio untuk:', text);
 
  const resp = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
 
  if (resp.status !== 200) throw new Error('StreamElements error: ' + resp.status);
  const buffer = Buffer.from(resp.data);
  console.log(`[TTS] Audio generated: ${(buffer.length / 1024).toFixed(1)} KB`);
  return buffer;
}
 
// ─── TTS: UPLOAD AUDIO KE ROBLOX OPEN CLOUD ──────────────────
// Perlu: ROBLOX_API_KEY dengan permission "asset:write"
async function uploadAudioToRoblox(audioBuffer, displayName) {
  if (!ROBLOX_USER_ID) throw new Error('ROBLOX_USER_ID belum di-set di env vars!');
 
  const form = new FormData();
 
  // Metadata asset
  form.append('request', JSON.stringify({
    assetType:       'Audio',
    displayName:     displayName.substring(0, 50),
    description:     'Auto-generated TTS for donation alert',
    creationContext: {
      creator:       { userId: String(ROBLOX_USER_ID) },
      expectedPrice: 0,
    },
  }), { contentType: 'application/json' });
 
  // File audio MP3
  form.append('fileContent', audioBuffer, {
    filename:    'donation_tts.mp3',
    contentType: 'audio/mpeg',
  });
 
  console.log('[TTS] Uploading audio ke Roblox Open Cloud...');
  const resp = await axios.post(
    'https://apis.roblox.com/assets/v1/assets',
    form,
    {
      headers: { ...form.getHeaders(), 'x-api-key': ROBLOX_API_KEY },
      timeout: 20000,
    }
  );
 
  // Ambil operationId dari path "operations/abc123"
  const opPath = resp.data.path || '';
  const opId   = opPath.replace('operations/', '') || resp.data.operationId;
  if (!opId) throw new Error('Tidak dapat operationId dari response: ' + JSON.stringify(resp.data));
 
  console.log('[TTS] Upload started, operationId:', opId);
  return opId;
}
 
// ─── TTS: TUNGGU ASSET SELESAI DIPROSES ──────────────────────
// Roblox memproses (moderasi) audio sebelum bisa dipakai.
// Untuk TTS pendek biasanya selesai dalam 5-30 detik.
async function waitForAsset(opId, timeoutMs = 90_000) {
  const deadline  = Date.now() + timeoutMs;
  let   pollCount = 0;
 
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4000));  // poll tiap 4 detik
    pollCount++;
 
    const resp = await axios.get(
      `https://apis.roblox.com/assets/v1/operations/${opId}`,
      { headers: { 'x-api-key': ROBLOX_API_KEY }, timeout: 10000 }
    );
 
    console.log(`[TTS] Polling #${pollCount}:`, JSON.stringify(resp.data).substring(0, 120));
 
    if (resp.data.done) {
      // Cari assetId di berbagai tempat response
      const assetId =
        resp.data.response?.assetId        ||
        resp.data.response?.asset?.assetId ||
        resp.data.response?.id             ||
        null;
 
      if (!assetId) throw new Error('Done tapi tidak ada assetId: ' + JSON.stringify(resp.data));
 
      console.log('[TTS] ✅ Asset siap! assetId:', assetId);
      return String(assetId);
    }
  }
 
  throw new Error(`TTS timeout setelah ${timeoutMs / 1000} detik`);
}
 
// ─── TTS: PIPELINE UTAMA ─────────────────────────────────────
async function runTTSPipeline(donationData) {
  if (!TTS_ENABLED) {
    if (!ROBLOX_USER_ID) console.log('[TTS] Dinonaktifkan: ROBLOX_USER_ID belum di-set');
    return;
  }
 
  const { username, amount, message, timestamp } = donationData;
 
  // Buat teks yang akan dibaca AI
  const amountWords = amountToWords(amount);
  let ttsText = `${username} berdonasi ${amountWords}`;
  if (message && message.trim() !== '') {
    ttsText += `. Pesan: ${message}`;
  }
 
  console.log('[TTS] Teks yang akan dibaca:', ttsText);
 
  try {
    // Step 1: Generate audio
    const audioBuffer = await generateTTS(ttsText);
 
    // Step 2: Upload ke Roblox
    const assetName = `DonTTS_${Date.now()}`;
    const opId      = await uploadAudioToRoblox(audioBuffer, assetName);
 
    // Step 3: Tunggu asset diproses
    const assetId = await waitForAsset(opId);
 
    // Step 4: Kirim asset ID ke game via MessagingService
    await publishToRoblox(
      { assetId, ts: timestamp || Date.now() },
      'DonationAudio'
    );
 
    console.log(`[TTS] ✅ Pipeline selesai — assetId: ${assetId} dikirim ke game`);
 
  } catch (err) {
    console.error('[TTS] ❌ Pipeline gagal:', err.message);
  }
}
 
// ─── NORMALISE BAGIBAGI PAYLOAD ───────────────────────────────
function normaliseBagibagi(body) {
  const username = body.donatur || body.username || body.donor_name || body.name || 'Anonim';
  const message  = body.pesan  || body.message  || body.note       || body.komentar || '';
  const amount   = parseInt(body.nominal ?? body.amount ?? body.jumlah ?? body.donation_amount ?? 0, 10);
  const type     = body.type   || body.jenis    || 'donation';
  return { username, message, amount, type };
}
 
// ─── DASHBOARD HTML ───────────────────────────────────────────
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
  --text:#E8E4FF;--muted:#7A72A8;--green:#4ADE80;--red:#F87171;--blue:#60A5FA;
  --border:rgba(123,94,167,0.3);
}
html,body{background:var(--dark);color:var(--text);font-family:'Syne',sans-serif;min-height:100vh}
body::after{content:'';position:fixed;inset:0;
  background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);
  background-size:48px 48px;pointer-events:none;z-index:0;opacity:.2}
.container{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:40px 24px 80px}
header{text-align:center;margin-bottom:48px}
.logo-badge{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,var(--dark3),var(--dark2));border:1px solid var(--border);border-radius:100px;padding:8px 20px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--gold);margin-bottom:24px;letter-spacing:.1em}
.logo-badge::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
h1{font-size:clamp(28px,5vw,50px);font-weight:800;background:linear-gradient(135deg,#fff 30%,var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px}
.sub{color:var(--muted);font-size:14px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:680px){.grid{grid-template-columns:1fr}}
.card-full{grid-column:1/-1}
.card{background:linear-gradient(160deg,var(--dark3),var(--dark2));border:1px solid var(--border);border-radius:16px;padding:26px;position:relative;overflow:hidden}
.card-title{font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--gold);margin-bottom:18px;display:flex;align-items:center;gap:8px}
.card-title::after{content:'';flex:1;height:1px;background:var(--border)}
.field{margin-bottom:14px}
.field label{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;text-transform:uppercase}
.field input,.field textarea{width:100%;background:var(--dark);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-family:'Syne',sans-serif;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s;resize:none}
.field textarea{height:68px}
.field input:focus,.field textarea:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(255,210,51,.12)}
.presets{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:18px}
.preset-btn{background:var(--dark);border:1px solid var(--border);border-radius:100px;padding:5px 13px;color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:11px;cursor:pointer;transition:all .2s}
.preset-btn:hover{border-color:var(--gold);color:var(--gold)}
.btn-send{width:100%;padding:13px;background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;border-radius:12px;font-family:'Syne',sans-serif;font-weight:800;font-size:15px;color:#0A0A14;cursor:pointer;transition:all .2s}
.btn-send:disabled{opacity:.5;cursor:not-allowed}
.btn-send:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(255,149,0,.35)}
#result{margin-top:12px;padding:11px 14px;border-radius:10px;font-family:'JetBrains Mono',monospace;font-size:12px;display:none;line-height:1.5}
#result.success{display:block;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.3);color:var(--green)}
#result.error{display:block;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3);color:var(--red)}
#log{font-family:'JetBrains Mono',monospace;font-size:11.5px;max-height:280px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
.log-entry{padding:7px 11px;border-radius:7px;margin-bottom:5px;line-height:1.5;animation:fi .3s ease}
@keyframes fi{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
.log-entry.ok{background:rgba(74,222,128,.07);border-left:3px solid var(--green);color:var(--green)}
.log-entry.err{background:rgba(248,113,113,.07);border-left:3px solid var(--red);color:var(--red)}
.log-entry.inf{background:rgba(123,94,167,.1);border-left:3px solid var(--purple);color:var(--muted)}
.log-entry.tts{background:rgba(96,165,250,.07);border-left:3px solid var(--blue);color:var(--blue)}
.log-time{color:var(--muted);margin-right:7px}
.info-box{background:var(--dark);border:1px solid var(--border);border-radius:9px;padding:12px 15px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--gold);word-break:break-all;margin-bottom:12px}
.info-box .lbl{color:var(--muted);font-size:10px;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em}
.status-row{display:flex;align-items:center;gap:10px;margin-top:12px}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dot.online{background:var(--green);box-shadow:0 0 8px var(--green)}
.dot.offline{background:var(--red)}
.dot.chk{background:var(--gold);animation:pulse 1s infinite}
.status-text{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);flex:1}
.btn-sm{background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);padding:4px 10px;cursor:pointer;font-size:11px;font-family:'Syne',sans-serif;transition:all .2s}
.btn-sm:hover{border-color:var(--gold);color:var(--gold)}
.spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(0,0,0,.3);border-top-color:#000;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:5px}
@keyframes spin{to{transform:rotate(360deg)}}
.tts-status{margin-top:14px;padding:10px 14px;background:rgba(96,165,250,.07);border:1px solid rgba(96,165,250,.25);border-radius:9px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--blue);display:none}
.tts-status.show{display:block}
.tag{display:inline-block;padding:2px 8px;border-radius:100px;font-size:10px;font-weight:700;margin-left:6px;vertical-align:middle}
.tag-on{background:rgba(74,222,128,.15);color:var(--green);border:1px solid rgba(74,222,128,.3)}
.tag-off{background:rgba(248,113,113,.15);color:var(--red);border:1px solid rgba(248,113,113,.3)}
</style>
</head>
<body>
<div class="container">
  <header>
    <div class="logo-badge">⚡ DONATION BRIDGE + TTS</div>
    <h1>Dashboard Testing<br/>Donasi & Suara AI</h1>
    <p class="sub">Notif muncul langsung • Suara AI menyusul saat audio siap</p>
  </header>
 
  <div class="grid">
 
    <!-- STATUS -->
    <div class="card card-full">
      <div class="card-title">🌐 Status Server</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="info-box" style="margin:0">
          <span class="lbl">Server URL</span>
          <span id="serverUrlTxt">—</span>
        </div>
        <div class="info-box" style="margin:0">
          <span class="lbl">Webhook BagiBagi</span>
          <span id="webhookUrlTxt">—</span>
          <button class="btn-sm" style="margin-top:6px" onclick="copyWebhook()">📋 Copy</button>
        </div>
      </div>
      <div class="status-row">
        <div class="dot chk" id="statusDot"></div>
        <span class="status-text" id="statusText">Mengecek...</span>
        <button class="btn-sm" onclick="checkStatus()">↻ Refresh</button>
      </div>
    </div>
 
    <!-- FORM -->
    <div class="card">
      <div class="card-title">🧪 Test Donation + Suara AI</div>
      <div class="field">
        <label>Username Donatur</label>
        <input type="text" id="username" value="Xanns4"/>
      </div>
      <div class="field">
        <label>Nominal (Rp)</label>
        <input type="number" id="amount" value="50000" step="1000"/>
      </div>
      <div class="presets">
        <span style="font-size:10px;color:var(--muted);align-self:center;margin-right:4px">Preset:</span>
        <button class="preset-btn" onclick="sa(5000)">5rb</button>
        <button class="preset-btn" onclick="sa(10000)">10rb</button>
        <button class="preset-btn" onclick="sa(25000)">25rb</button>
        <button class="preset-btn" onclick="sa(50000)">50rb</button>
        <button class="preset-btn" onclick="sa(100000)">100rb</button>
        <button class="preset-btn" onclick="sa(500000)">500rb</button>
        <button class="preset-btn" onclick="sa(1000000)">1jt</button>
      </div>
      <div class="field">
        <label>Pesan (opsional)</label>
        <textarea id="message" placeholder="Pesan donatur...">Semangat streamnya kak!</textarea>
      </div>
      <button class="btn-send" id="sendBtn" onclick="sendTest()">
        🚀 Kirim ke Roblox + Generate Suara
      </button>
      <div id="result"></div>
      <div class="tts-status" id="ttsStatus">🔊 Suara AI sedang diproses di server...</div>
    </div>
 
    <!-- LOG -->
    <div class="card">
      <div class="card-title" style="justify-content:space-between">
        <span>📋 Log</span>
        <button onclick="cl()" class="btn-sm">Hapus</button>
      </div>
      <div id="log">
        <div class="log-entry inf"><span class="log-time">--:--:--</span>Dashboard siap.</div>
      </div>
    </div>
 
    <!-- BATCH -->
    <div class="card card-full">
      <div class="card-title">⚡ Batch Test</div>
      <p style="font-size:13px;color:var(--muted);margin-bottom:16px">Kirim beberapa donasi — masing-masing akan generate suara AI sendiri.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-send" style="flex:1;min-width:140px" onclick="batch(3)">3 Donasi</button>
        <button class="btn-send" style="flex:1;min-width:140px;background:linear-gradient(135deg,#A78BFA,#7C3AED);color:#fff" onclick="batch(5)">5 Donasi</button>
      </div>
    </div>
 
  </div>
</div>
<script>
  const BASE = window.location.origin;
  document.getElementById('serverUrlTxt').textContent  = BASE;
  document.getElementById('webhookUrlTxt').textContent = BASE + '/webhook/bagibagi';
 
  function sa(v){ document.getElementById('amount').value=v; }
  function fmt(n){ return 'Rp '+parseInt(n).toLocaleString('id-ID'); }
  function cl(){ document.getElementById('log').innerHTML=''; }
 
  function copyWebhook(){
    navigator.clipboard.writeText(BASE+'/webhook/bagibagi');
    addLog('📋 Webhook URL disalin!','inf');
  }
 
  function addLog(msg,type='inf'){
    const log=document.getElementById('log');
    const t=new Date().toLocaleTimeString('id-ID',{hour12:false});
    const el=document.createElement('div');
    el.className='log-entry '+type;
    el.innerHTML='<span class="log-time">'+t+'</span>'+msg;
    log.prepend(el);
    while(log.children.length>80) log.lastElementChild.remove();
  }
 
  async function checkStatus(){
    const dot=document.getElementById('statusDot'),txt=document.getElementById('statusText');
    dot.className='dot chk'; txt.textContent='Mengecek...';
    try{
      const r=await fetch(BASE+'/health');
      const d=await r.json();
      dot.className='dot online';
      const ttsTag = d.tts_enabled
        ? '<span class="tag tag-on">TTS ON</span>'
        : '<span class="tag tag-off">TTS OFF — set ROBLOX_USER_ID</span>';
      txt.innerHTML='✅ Server online '+ttsTag;
    }catch(e){
      dot.className='dot offline';
      txt.textContent='❌ '+e.message;
    }
  }
 
  async function sendDonation(username,amount,message,silent=false){
    if(!silent){
      const btn=document.getElementById('sendBtn');
      btn.disabled=true; btn.innerHTML='<span class="spinner"></span>Mengirim...';
    }
    try{
      const r=await fetch(BASE+'/test-donation',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username,amount,message}),
      });
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||'HTTP '+r.status);
      if(!silent){
        document.getElementById('result').className='success';
        document.getElementById('result').innerHTML=
          '✅ Notifikasi terkirim!<br/><small>🔊 Suara AI sedang diproses di background...</small>';
        document.getElementById('ttsStatus').classList.add('show');
        setTimeout(()=>document.getElementById('ttsStatus').classList.remove('show'), 90000);
      }
      addLog('✅ '+username+' | '+fmt(amount)+(d.tts_processing?' | 🔊 TTS processing...':''),'ok');
      if(d.tts_processing) addLog('🔊 TTS pipeline dimulai — audio akan muncul di game dalam ~10-30 detik','tts');
      return true;
    }catch(e){
      if(!silent){
        document.getElementById('result').className='error';
        document.getElementById('result').innerHTML='❌ '+e.message;
      }
      addLog('❌ '+e.message,'err');
      return false;
    }finally{
      if(!silent){
        const btn=document.getElementById('sendBtn');
        btn.disabled=false; btn.innerHTML='🚀 Kirim ke Roblox + Generate Suara';
      }
    }
  }
 
  function sendTest(){
    const u=document.getElementById('username').value.trim()||'TestUser';
    const a=parseInt(document.getElementById('amount').value)||10000;
    const m=document.getElementById('message').value.trim();
    sendDonation(u,a,m);
  }
 
  const USERS=['Xanns4','SakuraNight','NusantaraHero','DoraemonFan99','WarriorJakarta'];
  const MSGS=['Semangat streamnya kak!','Gas terus! 🔥','Auto nonton terus nih','Mantap kontennya!','Gacor selalu kak!'];
  const AMTS=[5000,10000,25000,50000,100000,500000];
 
  async function batch(n){
    addLog('⚡ Batch '+n+' donasi dimulai...','inf');
    for(let i=0;i<n;i++){
      const u=USERS[~~(Math.random()*USERS.length)];
      const a=AMTS[~~(Math.random()*AMTS.length)];
      const m=MSGS[~~(Math.random()*MSGS.length)];
      await sendDonation(u,a,m,true);
      await new Promise(r=>setTimeout(r,1500));
    }
    addLog('✅ Batch '+n+' selesai! Cek game untuk notif & suara.','ok');
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
app.get('/', (req, res) => res.redirect('/dashboard'));
app.get('/health', (req, res) => res.json({
  status:      'online',
  service:     'BagiBagi → Roblox Bridge',
  tts_enabled: TTS_ENABLED,
  tts_voice:   TTS_VOICE,
  endpoints: {
    dashboard: 'GET  /dashboard',
    webhook:   'POST /webhook/bagibagi',
    test:      'POST /test-donation',
  },
}));
 
// ─── HANDLER UTAMA DONASI ────────────────────────────────────
async function processDonation(username, message, amount, isTest = false) {
  const timestamp = Date.now();
 
  const robloxPayload = {
    username:  String(username).substring(0, 50),
    message:   String(message  || '').substring(0, 150),
    amount,
    display:   formatRupiah(amount),
    timestamp,
    test:      isTest,
  };
 
  // Step 1: Kirim notifikasi SEKARANG (tidak tunggu TTS)
  const code = await publishToRoblox(robloxPayload);
  console.log(`[DONATION] Notif published (${code}):`, username, formatRupiah(amount));
 
  // Step 2: Jalankan TTS pipeline di background (tidak block response)
  if (TTS_ENABLED) {
    setImmediate(() => {
      runTTSPipeline({ username, amount, message, timestamp })
        .catch(err => console.error('[TTS] Background error:', err.message));
    });
  }
 
  return { code, tts_processing: TTS_ENABLED };
}
 
// ─── WEBHOOK ENDPOINT ─────────────────────────────────────────
app.post('/webhook/bagibagi', async (req, res) => {
  try {
    console.log('[WEBHOOK] Incoming:', JSON.stringify(req.body));
 
    if (WEBHOOK_SECRET) {
      const sig      = req.headers['x-bagibagi-signature'] || req.headers['x-signature'] || '';
      const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex');
      if (sig !== `sha256=${expected}`) return res.status(401).json({ error: 'Invalid signature' });
    }
 
    const { username, message, amount, type } = normaliseBagibagi(req.body);
    if (type !== 'donation' && type !== 'donasi') return res.json({ skipped: true });
    if (amount <= 0) return res.status(400).json({ error: 'Nominal tidak valid' });
 
    const result = await processDonation(username, message, amount, false);
    res.json({ success: true, tts_processing: result.tts_processing });
 
  } catch (err) {
    console.error('[WEBHOOK] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
 
// ─── TEST DONATION ENDPOINT ───────────────────────────────────
app.post('/test-donation', async (req, res) => {
  try {
    const { username, message, amount } = req.body;
    if (!username || !amount) return res.status(400).json({ error: 'username & amount wajib' });
 
    const result = await processDonation(username, message, parseInt(amount, 10), true);
    res.json({ success: true, tts_processing: result.tts_processing });
 
  } catch (err) {
    console.error('[TEST] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[SERVER] Running   : http://localhost:${PORT}`);
  console.log(`[SERVER] Dashboard : http://localhost:${PORT}/dashboard`);
  console.log(`[SERVER] TTS       : ${TTS_ENABLED ? 'ENABLED (voice: ' + TTS_VOICE + ')' : 'DISABLED (set ROBLOX_USER_ID untuk aktifkan)'}`);
});
