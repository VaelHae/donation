const express  = require('express');
const axios    = require('axios');
const cors     = require('cors');
const crypto   = require('crypto');
const FormData = require('form-data');
 
const app = express();
app.use(express.json());
app.use(cors());
 
// ─── CONFIG ──────────────────────────────────────────────────
const PORT                = process.env.PORT                || 3000;
const ROBLOX_API_KEY      = process.env.ROBLOX_API_KEY      || 'uggCUWnR3kOygNZW8JkDb4FiNYUPvR8PI/jEbgZunYhQxfirZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SW5WblowTlZWMjVTTTJ0UGVXZE9XbGM0U210RVlqUkdhVTVaVlZCMlVqaFFTUzlxUldKblduVnVXV2hSZUdacGNpSXNJbTkzYm1WeVNXUWlPaUkxTXpZMU9Ea3dOREU0SWl3aVpYaHdJam94TnpjME16TTBPVGsyTENKcFlYUWlPakUzTnpRek16RXpPVFlzSW01aVppSTZNVGMzTkRNek1UTTVObjAuUWM1U2NuX29IZHlZUzg3SjZLZEZTbXlqU0QyZUlERWY3ZVFRUE54Wi14TmZ5dzRjZTk0SXNsS3dWU0VSWWxFYXh3TjY3Z1Q1WHZ5SnphclpwbDdXejhWd1Fic04xYk9NWnBmTk0td3VpVlNvU0RNSXd0RGtmMk4tM0xUdDFOTWpJX3VkMGR6YzJjQzR2MVloQUNzUEo5M0Y2cDVaVThnRElPdkxNSUVQTmFFdVJZeDNxMWFaZWRZcnloMEN0UHlCT2FiSUM4RUExaFBVTFh5R04yZnpLVWxmc3RHOWN3WkJVUzZLSXF6d0E2dXNPTFl6MUQ5UC1fcDRSdlZ3akRXTklEXzNIR0VuT3NNZmpoY1ZmaE93VGxhb0o1cFA2XzFBcEhwNjZneUh0bTZpUlJhV3cwdG1heWdzZ2NtbGFLXzg2Y1FrcGN1MTVfYXZjTXRQNlFybUh3';
const ROBLOX_ASSET_API_KEY= process.env.ROBLOX_ASSET_API_KEY|| 'vw+t9fQ7pUa7VPg+r/dkFj35rogH+fNI7eIUvZg3JJqjGJOlZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SW5aM0szUTVabEUzY0ZWaE4xWlFaeXR5TDJSclJtb3pOWEp2WjBnclprNUpOMlZKVlhaYVp6TktTbkZxUjBwUGJDSXNJbTkzYm1WeVNXUWlPaUkxTXpZMU9Ea3dOREU0SWl3aVpYaHdJam94TnpjME16TTBPRFF5TENKcFlYUWlPakUzTnpRek16RXlORElzSW01aVppSTZNVGMzTkRNek1USTBNbjAuRDAzR1VXaXI0c0FfZlR4cDNLODVaeURKWFdMZmJOcHV6RU8yTkRueTE3VVN6SEQ2dThmNl9tVzFXcDFkQlZGRVM5UjYxdFA1RjI5eW1XelIxYXNfaXVFNm9PNVdLRkg2V3FuY2JwZ1hZdENBblEwS1ZwT25hYUNhaUxSSmo3NkhfMGFzdGdmY3YzbjlDSlZMS29IOXcwb1ZjWUpiR3lPWENtUjhPeUlhMDJoN3pVcEFPVk9GS2ZCSEdrZjVMWlpDOVE1MHhwcFpHM3BPSjFpYnEtUy1IeEdBNDI3dXI1VDVCb2dGMHhkTjFtd3FjWlgwd285bEZsS2JhSlZaYkZOMDFlazM2dmY0Zy1WLXI2TU1iOFlzNk1iQldiOEFrdmtpNjJGLUlfNGdia1BWTVo4UTQ1N0xlWDZYUlI4UkFkcVdWdzZJVHpYOUhCX3FOcXJqUFlMZHVB';
const UNIVERSE_ID         = process.env.UNIVERSE_ID         || '9926763102';
const WEBHOOK_SECRET      = process.env.WEBHOOK_SECRET      || '';

// ─── GROUP CONFIG (Ganti User ID → Group ID) ─────────────────
// Set ROBLOX_GROUP_ID di Railway env var
// Kosongkan ROBLOX_USER_ID jika pakai group
const ROBLOX_GROUP_ID     = process.env.ROBLOX_GROUP_ID     || '637138739';   // ← GROUP ID kamu
const ROBLOX_USER_ID      = process.env.ROBLOX_USER_ID      || '';   // ← kosongkan jika pakai group

const TTS_VOICE           = process.env.TTS_VOICE           || 'Salli';
const TTS_LANG            = process.env.TTS_LANG            || 'id';
const TTS_ENABLED         = process.env.TTS_ENABLED         !== 'false';
 
// Tentukan mode: GROUP atau USER
const USE_GROUP   = !!ROBLOX_GROUP_ID;
const CREATOR_ID  = USE_GROUP ? ROBLOX_GROUP_ID : ROBLOX_USER_ID;
const CREATOR_TYPE= USE_GROUP ? 'group' : 'user';

// Asset API key fallback ke messaging key jika tidak di-set terpisah
const ASSET_KEY = ROBLOX_ASSET_API_KEY || ROBLOX_API_KEY;
 
console.log('='.repeat(60));
console.log('[CONFIG] UNIVERSE_ID         :', UNIVERSE_ID    || '❌ BELUM DISET');
console.log('[CONFIG] ROBLOX_API_KEY      :', ROBLOX_API_KEY      ? `✅ (${ROBLOX_API_KEY.length} chars)` : '❌ BELUM DISET');
console.log('[CONFIG] ROBLOX_ASSET_API_KEY:', ROBLOX_ASSET_API_KEY? `✅ (${ROBLOX_ASSET_API_KEY.length} chars)` : '⚠️  tidak diset (pakai ROBLOX_API_KEY)');
console.log('[CONFIG] CREATOR MODE        :', USE_GROUP ? `✅ GROUP (${ROBLOX_GROUP_ID})` : ROBLOX_USER_ID ? `✅ USER (${ROBLOX_USER_ID})` : '❌ BELUM DISET');
console.log('[CONFIG] TTS                 :', TTS_ENABLED && CREATOR_ID ? '✅ ENABLED' : '❌ DISABLED');
console.log('='.repeat(60));
 
// ─── HELPER ──────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
 
function formatRupiah(n) {
  let s = String(Math.floor(n)), r = '', c = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (c > 0 && c % 3 === 0) r = '.' + r;
    r = s[i] + r; c++;
  }
  return 'Rp ' + r;
}
 
function amountToWords(n) {
  if (n >= 1_000_000_000) return (n/1e9).toFixed(1).replace('.0','') + ' miliar rupiah';
  if (n >= 1_000_000)     return (n/1e6).toFixed(1).replace('.0','') + ' juta rupiah';
  if (n >= 1_000)         return Math.floor(n/1000)                  + ' ribu rupiah';
  return n + ' rupiah';
}
 
// ─── ROBLOX: MESSAGING SERVICE ────────────────────────────────
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
 
// ─── TTS: STREAMELEMENTS ─────────────────────────────────────
async function ttsStreamElements(text) {
  const url = `https://api.streamelements.com/kappa/v2/speech?voice=${TTS_VOICE}&text=${encodeURIComponent(text)}`;
  const resp = await axios.get(url, {
    responseType: 'arraybuffer', timeout: 12000,
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://streamelements.com' },
    validateStatus: s => s === 200,
  });
  const buf = Buffer.from(resp.data);
  if (buf.length < 1000) throw new Error(`Response terlalu kecil: ${buf.length} bytes`);
  console.log(`[TTS-SE] ✅ ${(buf.length/1024).toFixed(1)} KB`);
  return buf;
}
 
// ─── TTS: GOOGLE TRANSLATE (FALLBACK) ────────────────────────
async function ttsGoogle(text) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.substring(0,190))}&tl=${TTS_LANG}&client=tw-ob&ttsspeed=0.9`;
  const resp = await axios.get(url, {
    responseType: 'arraybuffer', timeout: 12000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://translate.google.com' },
    validateStatus: s => s === 200,
  });
  const buf = Buffer.from(resp.data);
  if (buf.length < 500) throw new Error(`Response terlalu kecil: ${buf.length} bytes`);
  console.log(`[TTS-GT] ✅ ${(buf.length/1024).toFixed(1)} KB`);
  return buf;
}
 
async function generateTTS(text) {
  try { return await ttsStreamElements(text); }
  catch (e) { console.warn('[TTS] SE gagal, coba Google TTS:', e.message); }
  return ttsGoogle(text);
}
 
// ─── ROBLOX ASSETS: UPLOAD ────────────────────────────────────
// Mendukung GROUP creator maupun USER creator
// Untuk group: API key harus dibuat di Group → Creator Hub → API Keys
//              dengan permission "Assets API → asset:write"
async function uploadToRoblox(buf, name) {
  if (!CREATOR_ID) throw new Error(
    USE_GROUP
      ? 'ROBLOX_GROUP_ID belum diset'
      : 'ROBLOX_USER_ID belum diset (atau set ROBLOX_GROUP_ID untuk mode group)'
  );
  if (!ASSET_KEY) throw new Error('API Key untuk Assets belum diset');
 
  const form = new FormData();

  // ─── Buat creationContext sesuai mode ─────────────────────
  // Mode GROUP: { creator: { groupId: "12345" } }
  // Mode USER : { creator: { userId:  "12345" } }
  const creatorField = USE_GROUP
    ? { groupId: String(CREATOR_ID) }
    : { userId:  String(CREATOR_ID) };

  const requestBody = {
    assetType:   'Audio',
    displayName: name.substring(0, 50),
    description: 'Donation TTS',
    creationContext: {
      creator: creatorField,
    },
  };
 
  form.append('request', JSON.stringify(requestBody), {
    contentType: 'application/json',
    name: 'request',
  });
  form.append('fileContent', buf, {
    filename: 'tts.mp3',
    contentType: 'audio/mpeg',
    knownLength: buf.length,
  });
 
  console.log(`[UPLOAD] Mode: ${CREATOR_TYPE.toUpperCase()} | ID: ${CREATOR_ID} | Size: ${(buf.length/1024).toFixed(1)} KB`);
  console.log('[UPLOAD] Request body:', JSON.stringify(requestBody));

  let resp;
  try {
    resp = await axios.post('https://apis.roblox.com/assets/v1/assets', form, {
      headers: { ...form.getHeaders(), 'x-api-key': ASSET_KEY },
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  } catch (err) {
    const status  = err.response?.status;
    const body    = JSON.stringify(err.response?.data || '');

    if (status === 401) {
      const tips = USE_GROUP
        ? [
            `API Key harus dibuat dari halaman GROUP di Creator Hub (bukan dari akun personal)`,
            `Buka roblox.com → Creator Hub → pilih Group kamu → API Keys → buat key baru`,
            `Permission yang dibutuhkan: "Assets API → asset:write"`,
            `ROBLOX_GROUP_ID (${ROBLOX_GROUP_ID}) harus sesuai dengan group pemilik API Key`,
          ]
        : [
            `API Key belum punya permission "Assets API > asset:write"`,
            `Coba buat API Key baru, atau pisahkan key untuk Assets dan Messaging`,
            `ROBLOX_USER_ID (${ROBLOX_USER_ID}) harus cocok dengan pemilik API Key`,
          ];
      throw new Error(`401 Unauthorized saat upload asset.\nTips:\n${tips.map(t => '• ' + t).join('\n')}\nDetail Roblox: ${body}`);
    }
    if (status === 403) throw new Error(`403 Forbidden: API Key tidak punya akses asset:write. Body: ${body}`);
    if (status === 400) throw new Error(`400 Bad Request: ${body}`);
    throw new Error(`Upload gagal HTTP ${status}: ${body}`);
  }
 
  console.log('[UPLOAD] Response:', JSON.stringify(resp.data).substring(0, 200));
 
  const opPath = resp.data?.path || '';
  const opId   = opPath.replace(/^operations\//, '') || resp.data?.operationId;
  if (!opId) throw new Error('Tidak ada operationId: ' + JSON.stringify(resp.data));
 
  console.log('[UPLOAD] ✅ operationId:', opId);
  return opId;
}
 
// ─── ROBLOX ASSETS: POLL STATUS ──────────────────────────────
async function waitForAsset(opId, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  let   poll     = 0;
  while (Date.now() < deadline) {
    await sleep(5000);
    poll++;
    try {
      const r = await axios.get(
        `https://apis.roblox.com/assets/v1/operations/${opId}`,
        { headers: { 'x-api-key': ASSET_KEY }, timeout: 10000 }
      );
      console.log(`[POLL] #${poll}:`, JSON.stringify(r.data).substring(0, 160));
      if (r.data?.done) {
        const id = r.data.response?.assetId || r.data.response?.asset?.id || r.data.response?.id;
        if (!id) throw new Error('Done tanpa assetId: ' + JSON.stringify(r.data));
        console.log('[POLL] ✅ assetId:', id);
        return String(id);
      }
    } catch (e) {
      console.warn(`[POLL] #${poll} error:`, e.message);
    }
  }
  throw new Error(`Timeout ${timeoutMs/1000}s menunggu moderasi Roblox`);
}
 
// ─── TTS PIPELINE ─────────────────────────────────────────────
async function runTTSPipeline({ username, amount, message, timestamp }) {
  if (!TTS_ENABLED || !CREATOR_ID || !ASSET_KEY) return;
 
  const words = amountToWords(amount);
  let ttsText = `${username} berdonasi ${words}`;
  if (message?.trim()) ttsText += `. Pesan: ${message.trim()}`;
  ttsText = ttsText.substring(0, 300);
  console.log('[TTS] Teks:', ttsText);
 
  try {
    const buf     = await generateTTS(ttsText);
    const opId    = await uploadToRoblox(buf, `DonTTS_${Date.now()}`);
    const assetId = await waitForAsset(opId);
    await publishToRoblox({ assetId, ts: timestamp || Date.now() }, 'DonationAudio');
    console.log('[TTS] ✅ Pipeline selesai, assetId:', assetId);
    return assetId;
  } catch (err) {
    console.error('[TTS] ❌ Pipeline gagal:', err.message);
    return null;
  }
}
 
// ─── DIAGNOSA ENDPOINT ────────────────────────────────────────
app.get('/diagnose', async (req, res) => {
  const results = {};
 
  // 1. Config check
  results.config = {
    UNIVERSE_ID:          UNIVERSE_ID         ? '✅ ada' : '❌ KOSONG',
    ROBLOX_API_KEY:       ROBLOX_API_KEY      ? `✅ ada (${ROBLOX_API_KEY.length} chars)` : '❌ KOSONG',
    ROBLOX_ASSET_API_KEY: ROBLOX_ASSET_API_KEY? `✅ ada terpisah` : '⚠️ pakai ROBLOX_API_KEY',
    CREATOR_MODE:         USE_GROUP
                            ? `✅ GROUP (${ROBLOX_GROUP_ID})`
                            : ROBLOX_USER_ID
                              ? `✅ USER (${ROBLOX_USER_ID})`
                              : '❌ KOSONG — set ROBLOX_GROUP_ID atau ROBLOX_USER_ID',
    ROBLOX_GROUP_ID:      ROBLOX_GROUP_ID     ? `✅ ${ROBLOX_GROUP_ID}` : '— (tidak diset)',
    ROBLOX_USER_ID:       ROBLOX_USER_ID      ? `✅ ${ROBLOX_USER_ID}` : '— (tidak diset)',
  };

  results.setup_guide = USE_GROUP
    ? 'MODE GROUP: Pastikan API key dibuat dari halaman group di Creator Hub dengan permission Assets API > asset:write'
    : 'MODE USER: Pastikan API key dibuat dari akun personal di Creator Hub dengan permission Assets API > asset:write';
 
  // 2. Test MessagingService
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
 
  // 3. Test Assets API
  if (CREATOR_ID) {
    try {
      const creatorField = USE_GROUP
        ? { groupId: String(CREATOR_ID) }
        : { userId:  String(CREATOR_ID) };

      const form = new FormData();
      form.append('request', JSON.stringify({
        assetType: 'Audio',
        displayName: 'diagnose_test',
        creationContext: { creator: creatorField },
      }), { contentType: 'application/json' });
      // tidak lampirkan file audio → Roblox akan 400 jika key valid

      await axios.post('https://apis.roblox.com/assets/v1/assets', form, {
        headers: { ...form.getHeaders(), 'x-api-key': ASSET_KEY },
        timeout: 10000,
        validateStatus: () => true,
      }).then(r => {
        if (r.status === 400 || r.status === 200) {
          results.assets_api = `✅ API Key valid (HTTP ${r.status} — key diterima, creator: ${CREATOR_TYPE})`;
        } else if (r.status === 401) {
          const hint = USE_GROUP
            ? 'Buat API Key dari halaman GROUP di Creator Hub (bukan akun personal)!'
            : 'Buat API Key baru dengan permission asset:write di Creator Hub!';
          results.assets_api = `❌ HTTP 401 — ${hint}\nDetail: ${JSON.stringify(r.data)}`;
        } else if (r.status === 403) {
          results.assets_api = `❌ HTTP 403 — API Key tidak punya akses asset:write.\nDetail: ${JSON.stringify(r.data)}`;
        } else {
          results.assets_api = `⚠️ HTTP ${r.status}: ${JSON.stringify(r.data).substring(0,200)}`;
        }
      });
    } catch (e) {
      results.assets_api = `❌ Request error: ${e.message}`;
    }
  } else {
    results.assets_api = '⚠️ Skip — ROBLOX_GROUP_ID dan ROBLOX_USER_ID belum diset';
  }
 
  results.suggestion = results.assets_api?.includes('401')
    ? USE_GROUP
      ? 'SOLUSI GROUP: Buka roblox.com → Creator Hub → pilih Group → API Keys → buat key baru dengan "Assets API > asset:write"'
      : 'SOLUSI USER: Buat API Key BARU di Creator Hub dengan permission "Assets API > asset:write", set sebagai ROBLOX_ASSET_API_KEY di Railway'
    : 'Semua OK!';

  console.log('[DIAGNOSE]', JSON.stringify(results, null, 2));
  res.json(results);
});
 
// ─── NORMALISE BAGIBAGI ───────────────────────────────────────
function normaliseBagibagi(body) {
  return {
    username: body.donatur || body.username || body.donor_name || body.name || 'Anonim',
    message:  body.pesan   || body.message  || body.note       || body.komentar || '',
    amount:   parseInt(body.nominal ?? body.amount ?? body.jumlah ?? body.donation_amount ?? 0, 10),
    type:     body.type    || body.jenis    || 'donation',
  };
}
 
async function processDonation(username, message, amount, isTest = false) {
  const ts      = Date.now();
  const payload = {
    username: String(username).substring(0, 50),
    message:  String(message || '').substring(0, 150),
    amount,
    display:  formatRupiah(amount),
    timestamp: ts,
    test: isTest,
  };
  const code = await publishToRoblox(payload, 'DonationNotification');
  console.log(`[DONATION] ✅ (${code}): ${username} | ${formatRupiah(amount)}`);
  const canTTS = TTS_ENABLED && !!CREATOR_ID && !!ASSET_KEY;
  if (canTTS) setImmediate(() => runTTSPipeline({ username, amount, message, timestamp: ts }).catch(() => {}));
  return { success: true, tts_processing: canTTS };
}
 
// ─── DASHBOARD HTML ───────────────────────────────────────────
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Donation Bridge Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--gold:#FFD233;--gold2:#FF9500;--purple:#7B5EA7;--dark:#0A0A14;--dark2:#0F0F1E;--dark3:#161628;--text:#E8E4FF;--muted:#7A72A8;--green:#4ADE80;--red:#F87171;--blue:#60A5FA;--border:rgba(123,94,167,0.3)}
html,body{background:var(--dark);color:var(--text);font-family:'Syne',sans-serif;min-height:100vh}
body::after{content:'';position:fixed;inset:0;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:48px 48px;pointer-events:none;z-index:0;opacity:.15}
.wrap{position:relative;z-index:1;max-width:1020px;margin:0 auto;padding:36px 20px 80px}
header{text-align:center;margin-bottom:42px}
.badge{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--dark3),var(--dark2));border:1px solid var(--border);border-radius:100px;padding:7px 18px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--gold);margin-bottom:18px;letter-spacing:.1em}
.badge::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:p 2s infinite}
@keyframes p{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}
h1{font-size:clamp(24px,5vw,46px);font-weight:800;background:linear-gradient(135deg,#fff 30%,var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px}
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
.le.tt{background:rgba(96,165,250,.07);border-left:3px solid var(--blue);color:var(--blue)}
.lt{color:var(--muted);margin-right:5px}
.dr{display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:11px}
.dr:last-child{border-bottom:none}
.dk{color:var(--muted);min-width:200px;flex-shrink:0;margin-top:1px}
.dv{color:var(--text);flex:1;word-break:break-all}
.dv.g{color:var(--green)}.dv.r{color:var(--red)}.dv.w{color:var(--gold)}
.dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:5px}
.dot.on{background:var(--green);box-shadow:0 0 6px var(--green)}
.dot.of{background:var(--red)}
.dot.ck{background:var(--gold);animation:p 1s infinite}
.st{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);flex:1}
.bsm{background:none;border:1px solid var(--border);border-radius:5px;color:var(--muted);padding:3px 9px;cursor:pointer;font-size:10px;font-family:'Syne',sans-serif;transition:all .2s}
.bsm:hover{border-color:var(--gold);color:var(--gold)}
.bsm.blue:hover{border-color:var(--blue);color:var(--blue)}
.sp{display:inline-block;width:12px;height:12px;border:2px solid rgba(0,0,0,.25);border-top-color:#000;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:4px}
@keyframes spin{to{transform:rotate(360deg)}}
.alert{padding:10px 14px;border-radius:9px;font-size:12px;margin-bottom:14px;line-height:1.6}
.alert.warn{background:rgba(255,210,51,.07);border:1px solid rgba(255,210,51,.3);color:var(--gold)}
.alert.err{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3);color:var(--red)}
.alert.ok{background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.3);color:var(--green)}
.guide-box{background:rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.25);border-radius:10px;padding:14px 16px;margin-bottom:14px;font-size:12px;line-height:1.8}
.guide-box h4{color:var(--blue);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}
.guide-box ol{margin-left:16px;color:var(--muted)}
.guide-box ol li{margin-bottom:4px}
.guide-box code{background:rgba(0,0,0,.4);border:1px solid var(--border);border-radius:4px;padding:1px 5px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--blue)}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="badge">⚡ DONATION BRIDGE v5 — GROUP MODE</div>
    <h1>Dashboard Testing</h1>
    <p class="sub">Notif instan • Suara AI via Roblox Open Cloud • Group Assets</p>
  </header>
  <div class="grid">

    <!-- SETUP GUIDE GROUP -->
    <div class="card cf">
      <div class="ct">📖 Setup Guide — Group API Key</div>
      <div class="guide-box">
        <h4>Cara setup API Key untuk Group (agar TTS bisa upload audio)</h4>
        <ol>
          <li>Buka <strong>roblox.com</strong> → login sebagai owner/admin group</li>
          <li>Buka <strong>Creator Hub</strong> → di pojok kiri atas, ganti dropdown dari nama akunmu ke <strong>nama group</strong></li>
          <li>Pilih menu <strong>API Keys</strong> → klik <strong>Create API Key</strong></li>
          <li>Nama key: bebas (misal <code>DonationBridge</code>)</li>
          <li>Di bagian <strong>Access Permissions</strong>:
            <ul style="margin-left:16px;margin-top:4px">
              <li>Tambah <code>Assets API</code> → centang <code>asset:read</code> dan <code>asset:write</code></li>
              <li>Tambah <code>Messaging Service API</code> → centang <code>universe-messaging-service:publish</code></li>
            </ul>
          </li>
          <li>Di bagian <strong>Accepted IP Addresses</strong>: isi IP Railway atau biarkan kosong (allow all)</li>
          <li>Klik <strong>Save &amp; Generate Key</strong> → copy API key-nya</li>
          <li>Di Railway env vars: set <code>ROBLOX_ASSET_API_KEY</code> = key group tadi</li>
          <li>Set <code>ROBLOX_GROUP_ID</code> = ID group kamu (angka di URL group)</li>
          <li>Kosongkan <code>ROBLOX_USER_ID</code> (atau hapus env var-nya)</li>
        </ol>
      </div>
      <div style="font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace">
        💡 Group ID bisa dilihat di URL: roblox.com/groups/<strong style="color:var(--gold)">12345678</strong>/NamaGroup
      </div>
    </div>
 
    <!-- DIAGNOSA -->
    <div class="card cf">
      <div class="ct">🔍 Diagnosa Config <button class="bsm" style="margin-left:auto" onclick="runDiag()">↻ Run diagnosa</button></div>
      <div id="diagAlert"></div>
      <div id="diagRows">
        <div class="dr"><span class="dk">Status</span><span class="dv" id="dStatus">Memuat...</span></div>
        <div class="dr"><span class="dk">UNIVERSE_ID</span><span class="dv" id="dUniv">—</span></div>
        <div class="dr"><span class="dk">ROBLOX_API_KEY (Messaging)</span><span class="dv" id="dMsgKey">—</span></div>
        <div class="dr"><span class="dk">ROBLOX_ASSET_API_KEY</span><span class="dv" id="dAssetKey">—</span></div>
        <div class="dr"><span class="dk">Creator Mode</span><span class="dv" id="dCreator">—</span></div>
        <div class="dr"><span class="dk">ROBLOX_GROUP_ID</span><span class="dv" id="dGroupId">—</span></div>
        <div class="dr"><span class="dk">ROBLOX_USER_ID</span><span class="dv" id="dUserId">—</span></div>
        <div class="dr"><span class="dk">MessagingService</span><span class="dv" id="dMsg">—</span></div>
        <div class="dr"><span class="dk">Assets API</span><span class="dv" id="dAssets">—</span></div>
        <div class="dr"><span class="dk">TTS</span><span class="dv" id="dTts">—</span></div>
        <div class="dr"><span class="dk">Setup Guide</span><span class="dv w" id="dGuide">—</span></div>
        <div class="dr"><span class="dk">Webhook URL</span><span class="dv w" id="dWebhook">—</span> <button class="bsm" onclick="copyWH()">📋</button></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:12px">
        <div class="dot ck" id="sDot"></div>
        <span class="st" id="sTxt">Mengecek...</span>
        <button class="bsm blue" id="diagTtsBtn" style="display:none" onclick="testTTSOnly()">🔊 Test TTS saja</button>
      </div>
    </div>
 
    <!-- FORM -->
    <div class="card">
      <div class="ct">🧪 Test Donation</div>
      <div class="fi"><label>Username</label><input id="un" value="Xanns4"/></div>
      <div class="fi"><label>Nominal (Rp)</label><input type="number" id="am" value="50000" step="1000"/></div>
      <div class="pre">
        <span style="font-size:10px;color:var(--muted);align-self:center">Cepat:</span>
        <button class="pb" onclick="sa(5000)">5rb</button><button class="pb" onclick="sa(10000)">10rb</button>
        <button class="pb" onclick="sa(25000)">25rb</button><button class="pb" onclick="sa(50000)">50rb</button>
        <button class="pb" onclick="sa(100000)">100rb</button><button class="pb" onclick="sa(1000000)">1jt</button>
      </div>
      <div class="fi"><label>Pesan (opsional)</label><textarea id="ms">Semangat streamnya kak!</textarea></div>
      <button class="bs" id="sBtn" onclick="sendTest()">🚀 Kirim</button>
      <div class="res" id="res"></div>
    </div>
 
    <!-- LOG -->
    <div class="card">
      <div class="ct" style="justify-content:space-between"><span>📋 Log</span><button class="bsm" onclick="cl()">Hapus</button></div>
      <div id="log"><div class="le in"><span class="lt">--:--:--</span>Siap. Klik "Run diagnosa" untuk cek config.</div></div>
    </div>
 
    <!-- BATCH -->
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
function copyWH(){navigator.clipboard.writeText(B+'/webhook/bagibagi');log('📋 Copied!','in');}
 
function log(msg,t='in'){
  const l=document.getElementById('log'),tm=new Date().toLocaleTimeString('id-ID',{hour12:false});
  const e=document.createElement('div');
  e.className='le '+t; e.innerHTML='<span class="lt">'+tm+'</span>'+msg;
  l.prepend(e); while(l.children.length>80) l.lastElementChild.remove();
}
 
function sv(id,v,cls){const e=document.getElementById(id);if(e){e.textContent=v;e.className='dv '+(cls||'');}}
 
async function runDiag(){
  document.getElementById('sDot').className='dot ck';
  document.getElementById('sTxt').textContent='Menjalankan diagnosa...';
  document.getElementById('diagAlert').innerHTML='';
  try{
    const r=await fetch(B+'/diagnose');
    const d=await r.json();
    sv('dStatus','✅ Server online','g');
    sv('dUniv', d.config.UNIVERSE_ID, d.config.UNIVERSE_ID.startsWith('✅')?'g':'r');
    sv('dMsgKey', d.config.ROBLOX_API_KEY, d.config.ROBLOX_API_KEY.startsWith('✅')?'g':'r');
    sv('dAssetKey', d.config.ROBLOX_ASSET_API_KEY, 'w');
    sv('dCreator', d.config.CREATOR_MODE, d.config.CREATOR_MODE.startsWith('✅')?'g':'r');
    sv('dGroupId', d.config.ROBLOX_GROUP_ID || '— tidak diset', d.config.ROBLOX_GROUP_ID?.startsWith('✅')?'g':'w');
    sv('dUserId', d.config.ROBLOX_USER_ID || '— tidak diset', d.config.ROBLOX_USER_ID?.startsWith('✅')?'g':'w');
    sv('dMsg', d.messaging_service, d.messaging_service.startsWith('✅')?'g':'r');
    sv('dAssets', d.assets_api, d.assets_api?.startsWith('✅')?'g':d.assets_api?.startsWith('⚠️')?'w':'r');
    sv('dGuide', d.setup_guide || '—', 'w');
    sv('dTts', d.config.CREATOR_MODE?.startsWith('✅') && d.assets_api?.startsWith('✅') ?'✅ Siap':'❌ Belum bisa jalan',
       d.config.CREATOR_MODE?.startsWith('✅') && d.assets_api?.startsWith('✅')?'g':'r');
    sv('dWebhook', B+'/webhook/bagibagi','w');
 
    document.getElementById('sDot').className='dot on';
    document.getElementById('sTxt').textContent='✅ Diagnosa selesai';
 
    if(d.assets_api?.includes('401')){
      const isGroup = d.config.CREATOR_MODE?.includes('GROUP');
      document.getElementById('diagAlert').innerHTML=
        '<div class="alert err">❌ <b>401 pada Assets API</b><br/>'+
        (isGroup
          ? '➡️ Pastikan API Key dibuat dari halaman <b>GROUP</b> di Creator Hub (bukan akun personal).<br/>Lihat panduan setup di atas.'
          : '➡️ Buat API Key baru di Creator Hub dengan permission <b>Assets API → asset:write</b>, set sebagai <b>ROBLOX_ASSET_API_KEY</b>.')
        +'</div>';
      log('❌ 401 Assets API: Lihat panduan setup di card atas','er');
    } else if(d.assets_api?.startsWith('✅')){
      document.getElementById('diagTtsBtn').style.display='';
      log('✅ Assets API OK — TTS siap jalan!','ok');
    }
 
    if(d.messaging_service?.includes('❌')) log('❌ MessagingService gagal: '+d.messaging_service,'er');
    else log('✅ MessagingService OK','ok');
 
  }catch(e){
    document.getElementById('sDot').className='dot of';
    document.getElementById('sTxt').textContent='❌ '+e.message;
    sv('dStatus','❌ Server error: '+e.message,'r');
  }
}
 
async function testTTSOnly(){
  log('🔊 Test TTS pipeline dimulai...','tt');
  try{
    const r=await fetch(B+'/tts-test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'Halo! Ini adalah test suara donation. Sistem berjalan dengan baik.'})});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error);
    log('🔊 TTS pipeline berjalan di background. Suara akan muncul di game dalam ~10-45 detik.','tt');
  }catch(e){log('❌ TTS test gagal: '+e.message,'er');}
}
 
async function sendDonation(un,am,ms,silent=false){
  if(!silent){
    const b=document.getElementById('sBtn');
    b.disabled=true; b.innerHTML='<span class="sp"></span>Mengirim...';
  }
  try{
    const r=await fetch(B+'/test-donation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:un,amount:am,message:ms})});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error||'HTTP '+r.status);
    if(!silent){
      const res=document.getElementById('res');
      res.className='res ok';
      res.innerHTML=d.tts_processing?'✅ Notif terkirim! 🔊 Suara diproses... (~10-45 detik)':'✅ Notif terkirim! (TTS nonaktif)';
    }
    log('✅ '+un+' | '+fmt(am)+(d.tts_processing?' | 🔊 TTS berjalan':''),'ok');
    return true;
  }catch(e){
    if(!silent){const res=document.getElementById('res');res.className='res er';res.innerHTML='❌ '+e.message;}
    log('❌ '+e.message,'er'); return false;
  }finally{
    if(!silent){const b=document.getElementById('sBtn');b.disabled=false;b.innerHTML='🚀 Kirim';}
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
const MSG=['Semangat streamnya kak!','Gas terus! 🔥','Auto nonton terus nih','Mantap kontennya!'];
const AM=[5000,10000,25000,50000,100000,500000];
 
async function batch(n){
  log('⚡ Batch '+n+'...','in');
  for(let i=0;i<n;i++){
    await sendDonation(US[~~(Math.random()*US.length)],AM[~~(Math.random()*AM.length)],MSG[~~(Math.random()*MSG.length)],true);
    await new Promise(r=>setTimeout(r,1200));
  }
  log('✅ Batch '+n+' selesai!','ok');
}
 
runDiag();
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
  service:     'BagiBagi → Roblox Bridge v5',
  tts_enabled: TTS_ENABLED && !!CREATOR_ID && !!ASSET_KEY,
  creator_mode: CREATOR_TYPE,
  config: {
    universe_id:       UNIVERSE_ID || '',
    api_key_set:       !!ROBLOX_API_KEY,
    asset_api_key_set: !!ROBLOX_ASSET_API_KEY,
    group_id_set:      !!ROBLOX_GROUP_ID,
    user_id_set:       !!ROBLOX_USER_ID,
    tts_voice:         TTS_VOICE,
  },
}));
 
app.post('/tts-test', async (req, res) => {
  if (!CREATOR_ID) return res.status(400).json({ error: 'ROBLOX_GROUP_ID atau ROBLOX_USER_ID belum diset' });
  const text = req.body?.text || 'Test TTS berhasil!';
  res.json({ started: true, text });
  setImmediate(async () => {
    try {
      const buf = await generateTTS(text);
      const opId= await uploadToRoblox(buf, 'TTS_Test');
      const id  = await waitForAsset(opId);
      await publishToRoblox({ assetId: id, ts: Date.now() }, 'DonationAudio');
      console.log('[TTS-TEST] ✅ assetId:', id);
    } catch (e) { console.error('[TTS-TEST] ❌', e.message); }
  });
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
