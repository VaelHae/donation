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
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>奉納橋 | Donation Bridge</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;600;700&family=Noto+Sans+JP:wght@300;400;500&family=Zen+Antique&family=Shippori+Mincho:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --ink:#1A0F0A;
  --ink2:#2D1A12;
  --lacquer:#C0392B;
  --lacquer2:#9B2335;
  --lacquer-glow:rgba(192,57,43,0.25);
  --washi:#F5EFE0;
  --washi2:#EDE4CF;
  --washi3:#E2D5BC;
  --gold:#B8860B;
  --gold2:#DAA520;
  --sumi:#0D0806;
  --text-dark:#2C1810;
  --text-mid:#5C3D2E;
  --text-light:#8C6B5A;
  --border-ink:rgba(44,24,16,0.2);
  --border-gold:rgba(184,134,11,0.35);
  --shadow:rgba(26,15,10,0.4);
}

html,body{
  background:var(--washi);
  color:var(--text-dark);
  font-family:'Noto Sans JP',sans-serif;
  min-height:100vh;
  overflow-x:hidden;
}

/* Washi paper texture overlay */
body::before{
  content:'';
  position:fixed;inset:0;
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events:none;z-index:0;opacity:.6;
}

/* Vertical stripe pattern like shoji screen */
body::after{
  content:'';
  position:fixed;inset:0;
  background-image:repeating-linear-gradient(
    90deg,
    transparent,
    transparent 59px,
    rgba(44,24,16,0.04) 59px,
    rgba(44,24,16,0.04) 60px
  );
  pointer-events:none;z-index:0;
}

.wrap{
  position:relative;z-index:1;
  max-width:1060px;
  margin:0 auto;
  padding:0 20px 80px;
}

/* ── HEADER ── */
header{
  text-align:center;
  padding:48px 0 36px;
  position:relative;
}

/* Torii silhouette top decoration */
.torii-deco{
  display:flex;
  justify-content:center;
  align-items:flex-end;
  gap:0;
  margin-bottom:20px;
  height:56px;
}
.torii-deco svg{
  width:200px;height:56px;
  filter:drop-shadow(0 2px 8px var(--lacquer-glow));
}

.header-kanji{
  font-family:'Zen Antique',serif;
  font-size:clamp(34px,6vw,58px);
  color:var(--ink);
  line-height:1;
  letter-spacing:0.08em;
  margin-bottom:6px;
  text-shadow:2px 2px 0 rgba(192,57,43,0.08);
}

.header-sub-jp{
  font-family:'Shippori Mincho',serif;
  font-size:12px;
  letter-spacing:0.3em;
  color:var(--lacquer);
  margin-bottom:10px;
  text-transform:uppercase;
}

.header-latin{
  font-family:'Noto Serif JP',serif;
  font-size:13px;
  color:var(--text-mid);
  letter-spacing:0.12em;
}

/* Horizontal mon/seal divider */
.mon-divider{
  display:flex;align-items:center;gap:14px;
  margin:20px auto 0;max-width:420px;
}
.mon-divider::before,.mon-divider::after{
  content:'';flex:1;
  height:1px;
  background:linear-gradient(90deg,transparent,var(--border-gold),transparent);
}
.mon-glyph{
  width:28px;height:28px;flex-shrink:0;
}

/* ── STATUS BADGE ── */
.status-badge{
  display:inline-flex;align-items:center;gap:8px;
  background:var(--ink);
  border:1px solid var(--gold);
  border-radius:2px;
  padding:5px 16px;
  font-family:'Noto Sans JP',sans-serif;
  font-size:10px;
  letter-spacing:0.15em;
  color:var(--washi);
  margin:18px 0 0;
}
.status-badge .dot{
  width:6px;height:6px;
  border-radius:50%;
  background:var(--lacquer);
  box-shadow:0 0 8px var(--lacquer);
  animation:pulse 2s infinite;
}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.6)}}

/* ── GRID ── */
.grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:20px;
  margin-top:32px;
}
@media(max-width:700px){.grid{grid-template-columns:1fr}}
.cf{grid-column:1/-1}

/* ── CARD ── */
.card{
  background:rgba(255,251,245,0.85);
  border:1px solid var(--border-ink);
  border-radius:3px;
  position:relative;
  overflow:hidden;
  backdrop-filter:blur(4px);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.8) inset,
    0 4px 20px rgba(26,15,10,0.08);
}

/* Left lacquer accent bar */
.card::before{
  content:'';
  position:absolute;left:0;top:0;bottom:0;
  width:3px;
  background:linear-gradient(180deg,var(--lacquer),var(--lacquer2));
}

/* Subtle corner mon mark */
.card::after{
  content:'';
  position:absolute;right:10px;bottom:10px;
  width:20px;height:20px;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='9' fill='none' stroke='rgba(184,134,11,0.15)' stroke-width='1'/%3E%3Ccircle cx='10' cy='10' r='5' fill='none' stroke='rgba(184,134,11,0.15)' stroke-width='1'/%3E%3Cline x1='10' y1='1' x2='10' y2='19' stroke='rgba(184,134,11,0.1)' stroke-width='1'/%3E%3Cline x1='1' y1='10' x2='19' y2='10' stroke='rgba(184,134,11,0.1)' stroke-width='1'/%3E%3C/svg%3E");
  opacity:1;
}

.card-inner{padding:22px 22px 22px 28px}

/* ── CARD TITLE ── */
.ct{
  display:flex;align-items:center;gap:10px;
  margin-bottom:18px;
  padding-bottom:12px;
  border-bottom:1px solid var(--border-ink);
}
.ct-kanji{
  font-family:'Shippori Mincho',serif;
  font-size:9px;
  letter-spacing:0.2em;
  color:var(--lacquer);
  writing-mode:vertical-rl;
  text-orientation:mixed;
  line-height:1;
  padding-right:6px;
  border-right:1px solid rgba(192,57,43,0.25);
}
.ct-text{
  font-family:'Noto Serif JP',serif;
  font-size:11px;
  font-weight:600;
  letter-spacing:0.18em;
  text-transform:uppercase;
  color:var(--text-dark);
}
.ct-line{flex:1;height:1px;background:linear-gradient(90deg,var(--border-gold),transparent)}
.ct-btn{
  background:none;
  border:1px solid var(--border-ink);
  border-radius:2px;
  color:var(--text-light);
  font-size:9px;
  font-family:'Noto Sans JP',sans-serif;
  letter-spacing:0.08em;
  padding:3px 10px;
  cursor:pointer;
  transition:all .2s;
}
.ct-btn:hover{border-color:var(--lacquer);color:var(--lacquer)}

/* ── STATUS ROWS ── */
.dr{
  display:flex;align-items:flex-start;gap:12px;
  padding:9px 0;
  border-bottom:1px solid rgba(44,24,16,0.07);
  font-size:11px;
}
.dr:last-child{border-bottom:none}
.dk{
  color:var(--text-light);
  min-width:150px;flex-shrink:0;
  font-family:'Noto Sans JP',sans-serif;
  letter-spacing:0.05em;
  display:flex;align-items:center;gap:6px;
}
.dk::before{
  content:'';
  width:4px;height:4px;
  border-radius:50%;
  background:var(--lacquer);
  flex-shrink:0;
}
.dv{color:var(--text-dark);flex:1;word-break:break-all;font-family:'Noto Sans JP',monospace;font-size:10px}
.dv.g{color:#2D6A4F}.dv.r{color:var(--lacquer)}.dv.w{color:var(--gold)}

.status-footer{
  display:flex;align-items:center;gap:10px;
  margin-top:14px;
  padding-top:12px;
  border-top:1px solid var(--border-ink);
}
.s-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.s-dot.on{background:#2D6A4F;box-shadow:0 0 8px rgba(45,106,79,.6)}
.s-dot.of{background:var(--lacquer)}
.s-dot.ck{background:var(--gold);animation:pulse 1s infinite}
.s-txt{font-size:10px;color:var(--text-mid);letter-spacing:0.08em;font-family:'Noto Sans JP',sans-serif}

/* ── FORM ── */
.fi{margin-bottom:14px}
.fi label{
  display:block;
  font-size:9px;
  font-weight:500;
  letter-spacing:0.15em;
  text-transform:uppercase;
  color:var(--text-light);
  margin-bottom:5px;
  font-family:'Noto Sans JP',sans-serif;
}
.fi label span{
  font-family:'Shippori Mincho',serif;
  font-size:11px;
  color:var(--lacquer);
  margin-left:5px;
  letter-spacing:0.05em;
}
.fi input,.fi textarea{
  width:100%;
  background:rgba(255,251,245,0.9);
  border:1px solid var(--border-ink);
  border-radius:2px;
  padding:9px 12px;
  color:var(--text-dark);
  font-family:'Noto Sans JP',sans-serif;
  font-size:12px;
  outline:none;
  transition:border-color .2s, box-shadow .2s;
  resize:none;
}
.fi textarea{height:66px}
.fi input:focus,.fi textarea:focus{
  border-color:var(--lacquer);
  box-shadow:0 0 0 3px var(--lacquer-glow);
}

/* ── PRESET BUTTONS ── */
.pre{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
.pb{
  background:var(--washi2);
  border:1px solid var(--border-ink);
  border-radius:2px;
  padding:4px 13px;
  color:var(--text-mid);
  font-family:'Noto Sans JP',sans-serif;
  font-size:10px;
  letter-spacing:0.08em;
  cursor:pointer;
  transition:all .2s;
}
.pb:hover{border-color:var(--lacquer);color:var(--lacquer);background:rgba(192,57,43,0.04)}

/* ── SUBMIT BUTTON ── */
.bs{
  width:100%;
  padding:11px;
  background:linear-gradient(180deg,var(--lacquer),var(--lacquer2));
  border:none;
  border-radius:2px;
  font-family:'Shippori Mincho',serif;
  font-weight:700;
  font-size:13px;
  color:var(--washi);
  cursor:pointer;
  transition:all .2s;
  letter-spacing:0.2em;
  position:relative;
  overflow:hidden;
}
.bs::before{
  content:'';
  position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(255,255,255,0.08),transparent);
}
.bs:disabled{opacity:.5;cursor:not-allowed}
.bs:not(:disabled):hover{
  transform:translateY(-1px);
  box-shadow:0 6px 20px rgba(192,57,43,0.4);
}

.res{
  margin-top:10px;
  padding:9px 12px;
  border-radius:2px;
  font-size:11px;
  display:none;
  letter-spacing:0.05em;
  font-family:'Noto Sans JP',sans-serif;
  line-height:1.6;
}
.res.ok{display:block;background:rgba(45,106,79,.07);border-left:3px solid #2D6A4F;color:#2D6A4F}
.res.er{display:block;background:rgba(192,57,43,.07);border-left:3px solid var(--lacquer);color:var(--lacquer)}

/* ── LOGS ── */
#log{
  font-family:'Noto Sans JP',monospace;
  font-size:10px;
  max-height:280px;
  overflow-y:auto;
  scrollbar-width:thin;
  scrollbar-color:var(--border-ink) transparent;
}
.le{
  padding:6px 9px;
  border-radius:1px;
  margin-bottom:3px;
  line-height:1.6;
  animation:fadein .25s;
}
@keyframes fadein{from{opacity:0;transform:translateY(-3px)}to{opacity:1}}
.le.ok{background:rgba(45,106,79,.07);border-left:2px solid #2D6A4F;color:#2D6A4F}
.le.er{background:rgba(192,57,43,.07);border-left:2px solid var(--lacquer);color:var(--lacquer2)}
.le.in{background:rgba(44,24,16,.04);border-left:2px solid var(--border-gold);color:var(--text-mid)}
.lt{color:var(--text-light);margin-right:8px;font-size:9px}

/* ── ENDPOINT LIST ── */
.ep-list{display:flex;flex-direction:column;gap:0}
.ep{
  display:flex;align-items:center;gap:10px;
  padding:8px 0;
  border-bottom:1px solid rgba(44,24,16,0.07);
  font-size:11px;
}
.ep:last-child{border-bottom:none}
.ep-method{
  background:var(--ink);
  color:var(--washi);
  font-size:8px;
  letter-spacing:0.12em;
  padding:2px 7px;
  border-radius:1px;
  font-family:'Noto Sans JP',sans-serif;
  flex-shrink:0;
}
.ep-method.get{background:var(--gold)}
.ep-path{
  font-family:'Noto Sans JP',monospace;
  font-size:10px;
  color:var(--text-dark);
  flex:1;
}
.ep-desc{font-size:9px;color:var(--text-light);letter-spacing:0.05em}

/* ── WEBHOOK DISPLAY ── */
.wh-box{
  background:var(--washi2);
  border:1px solid var(--border-gold);
  border-radius:2px;
  padding:10px 13px;
  font-family:'Noto Sans JP',monospace;
  font-size:10px;
  color:var(--gold);
  word-break:break-all;
  line-height:1.6;
  letter-spacing:0.03em;
  cursor:pointer;
  transition:background .2s;
  position:relative;
}
.wh-box:hover{background:var(--washi3)}
.wh-box::after{
  content:'📋';
  position:absolute;right:10px;top:50%;transform:translateY(-50%);
  font-size:12px;
}

/* ── INFO BOX ── */
.info-box{
  background:rgba(192,57,43,0.04);
  border:1px solid rgba(192,57,43,0.2);
  border-left:3px solid var(--lacquer);
  border-radius:2px;
  padding:14px 16px;
  font-size:11px;
  line-height:1.9;
  color:var(--text-mid);
  margin-bottom:16px;
  font-family:'Noto Sans JP',sans-serif;
}
.info-box strong{color:var(--lacquer);letter-spacing:0.06em}

/* ── BATCH ── */
.batch-grid{display:flex;gap:10px;flex-wrap:wrap}
.bb{
  flex:1;min-width:100px;
  padding:10px 6px;
  border:1px solid var(--border-ink);
  border-radius:2px;
  background:var(--washi2);
  font-family:'Shippori Mincho',serif;
  font-size:12px;
  letter-spacing:0.15em;
  color:var(--text-dark);
  cursor:pointer;
  transition:all .2s;
  text-align:center;
}
.bb:hover{background:var(--ink);color:var(--washi);border-color:var(--ink)}
.bb.r{background:var(--lacquer);color:var(--washi);border-color:var(--lacquer2)}
.bb.r:hover{background:var(--lacquer2)}

/* ── SPINNER ── */
.sp{
  display:inline-block;width:10px;height:10px;
  border:2px solid rgba(255,255,255,0.25);
  border-top-color:rgba(255,255,255,0.9);
  border-radius:50%;
  animation:spin .6s linear infinite;
  vertical-align:middle;margin-right:5px;
}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── FOOTER ── */
footer{
  text-align:center;
  padding:40px 0 20px;
  font-family:'Shippori Mincho',serif;
  font-size:11px;
  color:var(--text-light);
  letter-spacing:0.2em;
  border-top:1px solid var(--border-ink);
  margin-top:40px;
}
footer .jp{font-size:18px;color:var(--lacquer);display:block;margin-bottom:6px}

/* ── PLATFORM GUIDE ── */
.platform-guide{display:flex;flex-direction:column;gap:10px}
.pg-item{
  display:flex;align-items:flex-start;gap:12px;
  padding:10px 12px;
  background:var(--washi2);
  border-radius:2px;
  border:1px solid var(--border-ink);
}
.pg-num{
  width:22px;height:22px;
  background:var(--lacquer);
  color:var(--washi);
  border-radius:1px;
  font-family:'Shippori Mincho',serif;
  font-size:11px;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;
  font-weight:700;
}
.pg-title{font-size:11px;font-weight:600;color:var(--text-dark);margin-bottom:2px;letter-spacing:0.05em}
.pg-desc{font-size:10px;color:var(--text-light);line-height:1.5}

</style>
</head>
<body>
<div class="wrap">

  <!-- HEADER -->
  <header>
    <div class="torii-deco">
      <svg viewBox="0 0 200 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Torii gate -->
        <rect x="0" y="18" width="200" height="7" rx="1" fill="#C0392B" opacity="0.9"/>
        <rect x="10" y="10" width="180" height="7" rx="1" fill="#C0392B" opacity="0.7"/>
        <!-- Left pillar -->
        <rect x="22" y="17" width="10" height="39" rx="1" fill="#9B2335"/>
        <!-- Right pillar -->
        <rect x="168" y="17" width="10" height="39" rx="1" fill="#9B2335"/>
        <!-- Kasagi curve detail -->
        <path d="M0 18 Q100 10 200 18" stroke="#DAA520" stroke-width="0.8" fill="none" opacity="0.5"/>
        <!-- Shimagi detail -->
        <rect x="8" y="9" width="184" height="2" fill="#DAA520" opacity="0.3"/>
      </svg>
    </div>

    <p class="header-sub-jp">奉 納 橋 ・ HŌNŌ-BASHI</p>
    <h1 class="header-kanji">寄付通知</h1>
    <p class="header-latin">Donation Bridge — Instant Notification System</p>

    <div class="mon-divider">
      <svg class="mon-glyph" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="13" stroke="#B8860B" stroke-width="1" opacity="0.5"/>
        <circle cx="14" cy="14" r="7" stroke="#B8860B" stroke-width="1" opacity="0.5"/>
        <circle cx="14" cy="14" r="2" fill="#B8860B" opacity="0.5"/>
        <line x1="14" y1="1" x2="14" y2="27" stroke="#B8860B" stroke-width="0.7" opacity="0.3"/>
        <line x1="1" y1="14" x2="27" y2="14" stroke="#B8860B" stroke-width="0.7" opacity="0.3"/>
        <line x1="4.5" y1="4.5" x2="23.5" y2="23.5" stroke="#B8860B" stroke-width="0.7" opacity="0.25"/>
        <line x1="23.5" y1="4.5" x2="4.5" y2="23.5" stroke="#B8860B" stroke-width="0.7" opacity="0.25"/>
      </svg>
    </div>

    <div>
      <div class="status-badge">
        <div class="dot"></div>
        <span id="headerStatus">MEMERIKSA SISTEM...</span>
      </div>
    </div>
  </header>

  <!-- GRID -->
  <div class="grid">

    <!-- STATUS CARD -->
    <div class="card cf">
      <div class="card-inner">
        <div class="ct">
          <span class="ct-kanji">状 態</span>
          <span class="ct-text">Server Status</span>
          <div class="ct-line"></div>
          <button class="ct-btn" onclick="runDiag()">↻ Periksa</button>
        </div>

        <div class="dr"><span class="dk">Status Server</span><span class="dv" id="dStatus">Memuat...</span></div>
        <div class="dr"><span class="dk">Universe ID</span><span class="dv" id="dUniv">—</span></div>
        <div class="dr"><span class="dk">API Key</span><span class="dv" id="dMsgKey">—</span></div>
        <div class="dr"><span class="dk">MessagingService</span><span class="dv" id="dMsg">—</span></div>
        <div class="dr"><span class="dk">Mode</span><span class="dv g" id="dMode">—</span></div>
        <div class="dr">
          <span class="dk">Webhook URL</span>
          <div class="wh-box" id="dWebhook" onclick="copyWH()">—</div>
        </div>

        <div class="status-footer">
          <div class="s-dot ck" id="sDot"></div>
          <span class="s-txt" id="sTxt">MENGECEK SISTEM...</span>
        </div>
      </div>
    </div>

    <!-- INFO CARD -->
    <div class="card cf">
      <div class="card-inner">
        <div class="ct">
          <span class="ct-kanji">情 報</span>
          <span class="ct-text">Cara Kerja</span>
          <div class="ct-line"></div>
        </div>
        <div class="info-box">
          <strong>零遅延 (Zero Delay)</strong> — server hanya mengirim teks ke Roblox via MessagingService secara instan.<br>
          TTS dibaca langsung di dalam game oleh script Roblox Studio, tanpa proses upload atau moderasi.<br>
          Notifikasi muncul dan suara berbunyi pada <strong>saat yang bersamaan</strong>.
        </div>
      </div>
    </div>

    <!-- TEST DONATION CARD -->
    <div class="card">
      <div class="card-inner">
        <div class="ct">
          <span class="ct-kanji">試 験</span>
          <span class="ct-text">Test Donation</span>
          <div class="ct-line"></div>
        </div>

        <div class="fi">
          <label>Username <span>名前</span></label>
          <input id="un" value="Xanns4" placeholder="Roblox username"/>
        </div>

        <div class="fi">
          <label>Nominal (Rp) <span>金額</span></label>
          <input type="number" id="am" value="50000" step="1000" min="1000"/>
        </div>

        <div class="pre">
          <button class="pb" onclick="sa(5000)">5rb</button>
          <button class="pb" onclick="sa(10000)">10rb</button>
          <button class="pb" onclick="sa(25000)">25rb</button>
          <button class="pb" onclick="sa(50000)">50rb</button>
          <button class="pb" onclick="sa(100000)">100rb</button>
          <button class="pb" onclick="sa(1000000)">1jt</button>
        </div>

        <div class="fi">
          <label>Pesan <span>メッセージ</span></label>
          <textarea id="ms">Semangat streamnya kak!</textarea>
        </div>

        <button class="bs" id="sBtn" onclick="sendTest()">奉納 ・ SUBMIT</button>
        <div class="res" id="res"></div>
      </div>
    </div>

    <!-- LOGS CARD -->
    <div class="card">
      <div class="card-inner">
        <div class="ct">
          <span class="ct-kanji">記 録</span>
          <span class="ct-text">Activity Log</span>
          <div class="ct-line"></div>
          <button class="ct-btn" onclick="cl()">消去</button>
        </div>
        <div id="log">
          <div class="le in"><span class="lt">--:--:--</span>システム起動中... Siap.</div>
        </div>
      </div>
    </div>

    <!-- ENDPOINTS CARD -->
    <div class="card">
      <div class="card-inner">
        <div class="ct">
          <span class="ct-kanji">端 点</span>
          <span class="ct-text">API Endpoints</span>
          <div class="ct-line"></div>
        </div>
        <div class="ep-list">
          <div class="ep">
            <span class="ep-method">POST</span>
            <span class="ep-path">/webhook/bagibagi</span>
            <span class="ep-desc">BagiBagi webhook</span>
          </div>
          <div class="ep">
            <span class="ep-method">POST</span>
            <span class="ep-path">/test-donation</span>
            <span class="ep-desc">Manual test</span>
          </div>
          <div class="ep">
            <span class="ep-method get">GET</span>
            <span class="ep-path">/health</span>
            <span class="ep-desc">Health check</span>
          </div>
          <div class="ep">
            <span class="ep-method get">GET</span>
            <span class="ep-path">/diagnose</span>
            <span class="ep-desc">Diagnostik sistem</span>
          </div>
          <div class="ep">
            <span class="ep-method get">GET</span>
            <span class="ep-path">/dashboard</span>
            <span class="ep-desc">Halaman ini</span>
          </div>
        </div>
      </div>
    </div>

    <!-- PLATFORM GUIDE CARD -->
    <div class="card">
      <div class="card-inner">
        <div class="ct">
          <span class="ct-kanji">設 定</span>
          <span class="ct-text">Platform Setup</span>
          <div class="ct-line"></div>
        </div>
        <div class="platform-guide">
          <div class="pg-item">
            <div class="pg-num">壱</div>
            <div>
              <div class="pg-title">💰 BagiBagi.co</div>
              <div class="pg-desc">Settings → Developer → Add Webhook URL</div>
            </div>
          </div>
          <div class="pg-item">
            <div class="pg-num">弐</div>
            <div>
              <div class="pg-title">📋 Copy Webhook</div>
              <div class="pg-desc">Klik URL webhook di atas untuk menyalin otomatis</div>
            </div>
          </div>
          <div class="pg-item">
            <div class="pg-num">参</div>
            <div>
              <div class="pg-title">✅ Verifikasi</div>
              <div class="pg-desc">Gunakan form Test Donation untuk memastikan koneksi</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- BATCH TEST -->
    <div class="card cf">
      <div class="card-inner">
        <div class="ct">
          <span class="ct-kanji">連 打</span>
          <span class="ct-text">Batch Test</span>
          <div class="ct-line"></div>
        </div>
        <div class="batch-grid">
          <button class="bb" onclick="batch(3)">三連 ・ 3 Donasi</button>
          <button class="bb" onclick="batch(5)">五連 ・ 5 Donasi</button>
          <button class="bb r" onclick="batch(10)">十連 ・ 10 Donasi</button>
        </div>
      </div>
    </div>

  </div><!-- /grid -->

  <footer>
    <span class="jp">奉納橋</span>
    Donation Bridge — Powered by Railway • Roblox MessagingService
  </footer>
</div>

<script>
const B = window.location.origin;
function sa(v){document.getElementById('am').value=v}
function cl(){document.getElementById('log').innerHTML=''}
function fmt(n){return 'Rp '+parseInt(n).toLocaleString('id-ID')}
function copyWH(){
  const url=B+'/webhook/bagibagi';
  navigator.clipboard.writeText(url).then(()=>log('📋 Webhook URL disalin ke clipboard','ok'));
}

function log(msg,t='in'){
  const l=document.getElementById('log');
  const tm=new Date().toLocaleTimeString('id-ID',{hour12:false});
  const e=document.createElement('div');
  e.className='le '+t;
  e.innerHTML='<span class="lt">'+tm+'</span>'+msg;
  l.prepend(e);
  while(l.children.length>80)l.lastElementChild.remove();
}

function sv(id,v,cls){
  const e=document.getElementById(id);
  if(e){e.textContent=v;e.className='dv '+(cls||'')}
}

async function runDiag(){
  document.getElementById('sDot').className='s-dot ck';
  document.getElementById('sTxt').textContent='MENGECEK SISTEM...';
  document.getElementById('headerStatus').textContent='MEMERIKSA SISTEM...';
  try{
    const r=await fetch(B+'/diagnose');
    const d=await r.json();
    sv('dStatus','✅ Online','g');
    sv('dUniv',d.config.UNIVERSE_ID,d.config.UNIVERSE_ID.startsWith('✅')?'g':'r');
    sv('dMsgKey',d.config.ROBLOX_API_KEY,d.config.ROBLOX_API_KEY.startsWith('✅')?'g':'r');
    sv('dMsg',d.messaging_service,d.messaging_service.startsWith('✅')?'g':'r');
    sv('dMode',d.config.mode,'g');
    const wb=document.getElementById('dWebhook');
    if(wb){wb.textContent=B+'/webhook/bagibagi';wb.className='wh-box'}
    document.getElementById('sDot').className='s-dot on';
    document.getElementById('sTxt').textContent='✅ 全システム正常 — SEMUA OK';
    document.getElementById('headerStatus').textContent='SISTEM AKTIF — SIAP TERIMA DONASI';
    if(d.messaging_service.startsWith('✅')) log('✅ MessagingService OK — siap terima donasi!','ok');
    else log('❌ MessagingService gagal: '+d.messaging_service,'er');
  }catch(e){
    document.getElementById('sDot').className='s-dot of';
    document.getElementById('sTxt').textContent='❌ '+e.message;
    document.getElementById('headerStatus').textContent='ERROR — '+e.message.toUpperCase();
    sv('dStatus','❌ Offline','r');
  }
}

async function sendDonation(un,am,ms,silent=false){
  if(!silent){
    const b=document.getElementById('sBtn');
    b.disabled=true;
    b.innerHTML='<span class="sp"></span>送信中... Mengirim...';
  }
  try{
    const r=await fetch(B+'/test-donation',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username:un,amount:am,message:ms})
    });
    const d=await r.json();
    if(!r.ok) throw new Error(d.error||'HTTP '+r.status);
    if(!silent){
      const res=document.getElementById('res');
      res.className='res ok';
      res.innerHTML='⚡ 成功 — Notifikasi terkirim secara instan!';
    }
    log('⚡ '+un+' | '+fmt(am)+(ms?' | "'+ms+'"':''),'ok');
    return true;
  }catch(e){
    if(!silent){
      const res=document.getElementById('res');
      res.className='res er';
      res.innerHTML='❌ エラー — '+e.message;
    }
    log('❌ '+e.message,'er');
    return false;
  }finally{
    if(!silent){
      const b=document.getElementById('sBtn');
      b.disabled=false;
      b.innerHTML='奉納 ・ SUBMIT';
    }
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
const MSG=['Semangat streamnya kak!','Gas terus!','Auto nonton terus nih','Mantap kontennya!','がんばれ！'];
const AM=[5000,10000,25000,50000,100000,500000];

async function batch(n){
  log('連打テスト — Batch '+n+' dimulai...','in');
  for(let i=0;i<n;i++){
    await sendDonation(
      US[~~(Math.random()*US.length)],
      AM[~~(Math.random()*AM.length)],
      MSG[~~(Math.random()*MSG.length)],
      true
    );
    await new Promise(r=>setTimeout(r,800));
  }
  log('✅ 完了 — Batch '+n+' selesai!','ok');
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
