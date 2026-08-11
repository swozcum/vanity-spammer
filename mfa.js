const http2 = require('http2');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

const BASE_HOST = 'discord.com';
const TOKEN = String(config.token || '').trim();
const PASSWORD = String(config.password || '');
const SERVER_ID = String(config.server_id || '').trim();
const VANITY = String(config.vanity || '').trim();

const MFA_FILE = path.join(__dirname, 'mfa.txt');
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const properties = Buffer.from(JSON.stringify({
  os: 'Windows',
  browser: 'Chrome',
  device: '',
  system_locale: 'tr-TR',
  browser_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  browser_version: '120.0.0.0',
  os_version: '10',
  referrer: 'https://discord.com/',
  referring_domain: 'discord.com',
  release_channel: 'stable',
  client_build_number: 342968,
  client_event_source: null
})).toString('base64');

let cachedMfaToken = null;
let isRefreshing = false;

function request(method, endpoint, headers = {}, data) {
  return new Promise((resolve, reject) => {
    const session = http2.connect(`https://${BASE_HOST}`, { rejectUnauthorized: false });

    const reqHeaders = {
      ':method': method,
      ':path': endpoint,
      ':scheme': 'https',
      ':authority': BASE_HOST,
      'authorization': TOKEN,
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      'x-super-properties': properties,
      'origin': `https://${BASE_HOST}`,
      'referer': `https://${BASE_HOST}/`,
      ...headers
    };

    const body = data !== undefined ? Buffer.from(JSON.stringify(data)) : null;
    if (body) reqHeaders['content-length'] = body.length;

    const req = session.request(reqHeaders);
    req.on('response', (resHeaders) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        session.close();
        try {
          let buf = Buffer.concat(chunks);
          const enc = resHeaders['content-encoding'];
          if (enc === 'gzip') buf = zlib.gunzipSync(buf);
          if (enc === 'br') buf = zlib.brotliDecompressSync(buf);
          let parsed = null;
          try { parsed = JSON.parse(buf.toString()); } catch { parsed = buf.toString(); }
          resolve({ statusCode: resHeaders[':status'], headers: resHeaders, body: parsed });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    session.on('error', () => {});
    if (body) req.write(body);
    req.end();
  });
}

function parseCookie(setCookie) {
  if (!setCookie) return null;
  const arr = Array.isArray(setCookie) ? setCookie : String(setCookie).split(',');
  return arr.map((c) => String(c).split(';')[0]).join('; ');
}

async function getMfaToken() {
  const ticketRes = await request(
    'PATCH',
    `/api/v9/guilds/${SERVER_ID}/vanity-url`,
    {},
    { code: VANITY }
  );

  if (ticketRes.body?.code !== 60003) {
    throw new Error('MFA ticket alinamadi: ' + JSON.stringify(ticketRes.body));
  }

  const { ticket, methods } = ticketRes.body.mfa;
  const available = Array.isArray(methods) ? methods.map((m) => m?.type).filter(Boolean) : [];
  if (!available.includes('password')) {
    throw new Error(`Password yontemi yok. Mevcut: ${available.join(',') || 'yok'}`);
  }

  const cookieHeader = parseCookie(ticketRes.headers?.['set-cookie'] || ticketRes.headers?.['Set-Cookie']);

  const finishHeaders = {
    'x-discord-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    'accept-language': 'en-US,en;q=0.5'
  };
  if (cookieHeader) finishHeaders.cookie = cookieHeader;

  const finishRes = await request('POST', '/api/v10/mfa/finish', finishHeaders, {
    ticket,
    mfa_type: 'password',
    data: PASSWORD
  });

  if (!finishRes.body?.token) {
    throw new Error('MFA basarisiz: ' + JSON.stringify(finishRes.body));
  }

  return finishRes.body.token;
}

function saveMfaTokenToFile(token) {
  fs.writeFileSync(MFA_FILE, `${token}\n`, 'utf8');
}

function readFreshMfaTokenFromFile(maxAgeMs = REFRESH_INTERVAL_MS) {
  if (!fs.existsSync(MFA_FILE)) return null;
  const token = fs.readFileSync(MFA_FILE, 'utf8').trim();
  if (!token) return null;
  const stats = fs.statSync(MFA_FILE);
  const ageMs = Date.now() - stats.mtimeMs;
  if (ageMs >= maxAgeMs) return null;
  return { token, remainingMs: maxAgeMs - ageMs };
}

async function refreshMfaToken() {
  if (isRefreshing) return;
  isRefreshing = true;
  console.log(`[MFA] MFA yenileniyor`);
  try {
    const token = await getMfaToken();
    saveMfaTokenToFile(token);
    cachedMfaToken = token;
    console.log(`[MFA] Yenilendi`);
  } catch (e) {
    console.log(`[MFA] HATA: ${e.message}`);
  } finally {
    isRefreshing = false;
  }
}

async function startMfaService() {
  console.log(`[MFA] Kontrol ediliyor`);
  const fresh = readFreshMfaTokenFromFile();
  if (fresh) {
    cachedMfaToken = fresh.token;
    console.log(`[MFA] MFA güncel: ~${Math.round(fresh.remainingMs / 1000)}s sonra.`);
    setTimeout(() => {
      refreshMfaToken();
      setInterval(refreshMfaToken, REFRESH_INTERVAL_MS);
    }, fresh.remainingMs);
    return;
  }
  console.log(`[MFA] MFA bulunamadı alınıyor`);
  await refreshMfaToken();
  setInterval(refreshMfaToken, REFRESH_INTERVAL_MS);
}

function getCurrentMfaToken() {
  return cachedMfaToken;
}

module.exports = {
  request,
  getCurrentMfaToken,
  startMfaService,
  refreshMfaToken,
  SERVER_ID
};
