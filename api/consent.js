/**
 * VibeNDA consent logger — optional serverless endpoint.
 * Deploy to Vercel: api/consent.js -> POST /api/consent
 * Logs: IP, headers, and request body (fingerprint + consent token).
 */

function getClientIp(request) {
  const headers = request.headers || {};
  return headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['x-real-ip'] ||
    headers['cf-connecting-ip'] ||
    '';
}

export async function POST(request) {
  const ip = getClientIp(request);
  const headers = {};
  ['user-agent', 'accept-language', 'referer'].forEach(h => {
    const v = request.headers?.get?.(h);
    if (v) headers[h] = v;
  });
  let body = null;
  try {
    body = await request.json();
  } catch (_) {}
  const log = {
    ts: new Date().toISOString(),
    ip,
    headers,
    body: body || {}
  };
  console.log(JSON.stringify(log));
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
