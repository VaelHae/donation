// ============================================================
//  BAGIBAGI → ROBLOX DONATION BRIDGE SERVER
//  Deploy ke Railway / VPS
//  Endpoint webhook: POST /webhook/bagibagi
// ============================================================

const express = require('express');
const axios   = require('axios');
const cors    = require('cors');
const crypto  = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

// ─── CONFIG (isi via Environment Variables di Railway) ───────
const PORT            = process.env.PORT            || 3000;
const ROBLOX_API_KEY  = process.env.ROBLOX_API_KEY  || 'uggCUWnR3kOygNZW8JkDbxmEAK/z+6b79fnwc6eKY3o8pbTcZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SW5WblowTlZWMjVTTTJ0UGVXZE9XbGM0U210RVluaHRSVUZMTDNvck5tSTNPV1p1ZDJNMlpVdFpNMjg0Y0dKVVl5SXNJbTkzYm1WeVNXUWlPaUkyTXpjeE16ZzNNemtpTENKbGVIQWlPakUzTnpReU16SXhOaklzSW1saGRDSTZNVGMzTkRJeU9EVTJNaXdpYm1KbUlqb3hOemMwTWpJNE5UWXlmUS5LWFN3TGw4VmhrYjRaSDYyZWgyZUM5OXFSdzlzUi1Makt2YkhJdGw1cTVkNjhoZ1ZHTTZMYlMxbmdRR211YUZuR0pJRFg1NGM5Z2c2alU0TVFwbTBsVERFVnBCblVGNVQtZUhqVS1WaU9LQWNidGk5OXdhcDN5dzk3dnlSNDd3Sk5HLThLbzNKX2E0dFd5WW1KQ1pKU2FXckFWSmZlZi1PbXA1OUxNMzRBbF9vUVRGWWJlRjAxNURDZ2c3OU8wcDM5Y3hiRVdsMHdNVXEzYkYtbTBaOW1jazNBRU9oNkZhcnJ1eTNlQ1hVWHhXX0hUOGVDbV9lTW5oZDAtb0VXcHF5N1QwUWJVaVF6ZjkycFd1ZERISmp4SlZ6d0Q0TlFyX0xWeEpRbkg2TW8yX0JjZmhTcFhKdUJwTHZyTXctRTFaclRsMTFaaEZmLXo1SG5xZnM0b1NWWlE=';
const UNIVERSE_ID     = process.env.UNIVERSE_ID      || '9926763102';
const WEBHOOK_SECRET  = process.env.WEBHOOK_SECRET   || '';   // optional, untuk verifikasi signature bagibagi
const TOPIC           = 'DonationNotification';
// ────────────────────────────────────────────────────────────

/**
 * Publish pesan ke Roblox MessagingService
 * Limit: message max 1 KB (Roblox limit)
 */
async function publishToRoblox(payload) {
  const message = JSON.stringify(payload);
  if (Buffer.byteLength(message, 'utf8') > 1024) {
    throw new Error('Payload melebihi 1 KB limit Roblox MessagingService');
  }

  const url = `https://apis.roblox.com/messaging-service/v1/universes/${UNIVERSE_ID}/topics/${TOPIC}`;

  const response = await axios.post(
    url,
    { message },
    {
      headers: {
        'x-api-key':     ROBLOX_API_KEY,
        'Content-Type':  'application/json',
      },
    }
  );

  return response.status;
}

// ─── HELPER: normalise payload dari berbagai format bagibagi ─
function normaliseBagibagi(body) {
  // Bagibagi bisa kirim berbagai field name — kita handle semua
  const username = body.donatur
    || body.username
    || body.donor_name
    || body.name
    || 'Anonim';

  const message = body.pesan
    || body.message
    || body.note
    || body.komentar
    || '';

  const amount = parseInt(
    body.nominal ?? body.amount ?? body.jumlah ?? body.donation_amount ?? 0,
    10
  );

  const type = body.type || body.jenis || 'donation';

  return { username, message, amount, type };
}

// ─── WEBHOOK ENDPOINT (dipasang di Bagibagi) ─────────────────
// URL: https://mapsaweriashinkuparty-production.up.railway.app/webhook/bagibagi
app.post('/webhook/bagibagi', async (req, res) => {
  try {
    console.log('[WEBHOOK] Incoming bagibagi payload:', JSON.stringify(req.body));

    // Verifikasi signature jika WEBHOOK_SECRET di-set
    if (WEBHOOK_SECRET) {
      const signature = req.headers['x-bagibagi-signature']
        || req.headers['x-signature']
        || '';
      const expected = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== `sha256=${expected}`) {
        console.warn('[WEBHOOK] Signature tidak valid!');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const { username, message, amount, type } = normaliseBagibagi(req.body);

    // Hanya proses event donation
    if (type !== 'donation' && type !== 'donasi') {
      console.log('[WEBHOOK] Event bukan donasi, di-skip:', type);
      return res.status(200).json({ skipped: true, reason: 'bukan donasi' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Nominal donasi tidak valid' });
    }

    const robloxPayload = {
      username: String(username).substring(0, 50),
      message:  String(message).substring(0, 150),
      amount,
      timestamp: Date.now(),
    };

    const statusCode = await publishToRoblox(robloxPayload);

    console.log(`[WEBHOOK] Berhasil publish ke Roblox (HTTP ${statusCode}):`, robloxPayload);
    res.status(200).json({ success: true, published: robloxPayload });

  } catch (err) {
    console.error('[WEBHOOK] Error:', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── TEST ENDPOINT (dari Dashboard) ──────────────────────────
app.post('/test-donation', async (req, res) => {
  try {
    const { username, message, amount } = req.body;

    if (!username || !amount) {
      return res.status(400).json({ error: 'username & amount wajib diisi' });
    }

    const robloxPayload = {
      username: String(username).substring(0, 50),
      message:  String(message || '').substring(0, 150),
      amount:   parseInt(amount, 10),
      timestamp: Date.now(),
      test: true,
    };

    const statusCode = await publishToRoblox(robloxPayload);

    console.log(`[TEST] Fake donation dikirim (HTTP ${statusCode}):`, robloxPayload);
    res.status(200).json({ success: true, published: robloxPayload });

  } catch (err) {
    console.error('[TEST] Error:', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'BagiBagi → Roblox Bridge',
    endpoints: {
      webhook:       'POST /webhook/bagibagi',
      test_donation: 'POST /test-donation',
    },
  });
});

app.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[SERVER] Universe ID  : ${UNIVERSE_ID}`);
  console.log(`[SERVER] Roblox Topic : ${TOPIC}`);
});
