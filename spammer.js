const fs = require('fs');
const path = require('path');
const https = require('https');
const { request, getCurrentMfaToken, startMfaService, refreshMfaToken } = require('./mfa');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

const TOKEN = String(config.token || '').trim();
const PASSWORD = String(config.password || '');
const SERVER_ID = String(config.server_id || '').trim();
const VANITY = String(config.vanity || '').trim();
const INTERVAL_MS = (Math.max(1, Number(config.interval) || 5)) * 1000;
const WEBHOOK_URL = String(config.webhook || '').trim();
const WEBHOOK_NAME = String(config.webhook_name || '').trim();
const WEBHOOK_AVATAR = String(config.webhook_avatar || '').trim();

let blockedUntil = 0;

function sendWebhook(vanity, ms) {
  return new Promise((resolve) => {
    if (!WEBHOOK_URL) return resolve();
    const webhookData = { content: `@everyone Claimed\n\`\`\`\n${vanity}\n\`\`\`` };
    if (WEBHOOK_NAME) webhookData.username = WEBHOOK_NAME;
    if (WEBHOOK_AVATAR) webhookData.avatar_url = WEBHOOK_AVATAR;
    const payload = Buffer.from(JSON.stringify(webhookData));
    let u;
    try { u = new URL(WEBHOOK_URL); } catch { return resolve(); }
    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    }, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve());
    });
    req.on('error', () => resolve());
    req.write(payload);
    req.end();
  });
}

async function tryClaim() {
  const start = Date.now();
  const mfaToken = getCurrentMfaToken();
  const headers = {};
  if (mfaToken) {
    headers['x-discord-mfa-authorization'] = mfaToken;
    headers['cookie'] = `__Secure-mfa_token=${encodeURIComponent(mfaToken)};`;
  }

  let res;
  try {
    res = await request('PATCH', `/api/v9/guilds/${SERVER_ID}/vanity-url`, headers, { code: VANITY });
  } catch (e) {
    console.log(`[${time()}] ISTEK HATASI: ${e.message}`);
    return;
  }

  const ms = Date.now() - start;
  const status = res.statusCode;
  const code = res.body?.code;

  if (status === 200) {
    console.log(`[${time()}] Claimed: discord.gg/${VANITY}`);
    await sendWebhook(VANITY, ms);
    process.exit(0);
  }

  if (code === 60003) {
    console.log(`[MFA] MFA bulunamadı alınıyor`);
    await refreshMfaToken();
    return;
  }

  if (code === 50035) {
    console.log(`[${VANITY}] Vanity alınamadı (${status})`);
    return;
  }

  if (status === 400) {
    console.log(`[${VANITY}] Vanity Alınamadı: ${res.body?.message || 'yok'}`);
    return;
  }

  if (status === 429) {
    const retryAfter = res.body?.retry_after != null ? res.body.retry_after : 30;
    blockedUntil = Date.now() + retryAfter * 1000 + 500;
    console.log(`[${time()}] RATE LIMIT (429) | ${retryAfter}s beklenecek`);
    return;
  }

  if (status === 403) {
    let msg = res.body?.message || JSON.stringify(res.body) || 'bos gövde';
    console.log(`[${time()}] 403 | ${msg}`);
    blockedUntil = Date.now() + 30000;
    return;
  }

  console.log(`[${time()}] Denendi (${status}) ${ms}ms ${res.body?.message ? '| ' + res.body.message : ''}`);
}

function time() {
  return new Date().toLocaleTimeString('tr-TR');
}

async function main() {
  if (!TOKEN || !PASSWORD || !SERVER_ID || !VANITY) {
    console.log('config.json\'u doldur');
    process.exit(1);
  }

  startMfaService();

  while (true) {
    const now = Date.now();
    if (now < blockedUntil) {
      await new Promise((r) => setTimeout(r, blockedUntil - now));
    }
    await tryClaim();
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

main();
