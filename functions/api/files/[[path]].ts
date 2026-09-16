// functions/api/files/[[path]].ts
// Backblaze B2 file store via S3-compatible API (SigV4, no dependencies).
// Secrets (wrangler pages secret put): B2_KEY_ID, B2_APP_KEY
// Vars (wrangler.toml): B2_BUCKET, B2_ENDPOINT (e.g. https://s3.us-east-005.backblazeb2.com)
//   PUT /api/files/:key  -> upload raw body
//   GET /api/files/:key  -> download (content-type passthrough)
//   DELETE /api/files/:key -> delete object
//   GET /api/files       -> list objects (S3 ListObjectsV2)

interface Env {
  B2_KEY_ID: string;
  B2_APP_KEY: string;
  B2_BUCKET: string;
  B2_ENDPOINT: string;
}

const enc = new TextEncoder();
async function sha256hex(data: ArrayBuffer | string): Promise<string> {
  const buf = typeof data === 'string' ? enc.encode(data) : data;
  const h = await crypto.subtle.digest('SHA-256', buf as ArrayBuffer);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function hmac(key: ArrayBuffer, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(msg));
}

async function s3fetch(
  env: Env, method: string, key: string, query: string,
  body: ArrayBuffer | undefined, contentType: string,
): Promise<Response> {
  const url = new URL(`${env.B2_ENDPOINT.replace(/\/$/, '')}/${env.B2_BUCKET}/${key}${query}`);
  const now = new Date();
  const amz = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amz.slice(0, 8);
  const region = 'us-east-005';
  const payloadHash = body ? await sha256hex(body) : await sha256hex('');
  const headers: Record<string, string> = {
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amz,
  };
  if (body) headers['content-type'] = contentType;
  const signed = Object.keys(headers).sort().join(';');
  const canon = [
    method, '/' + env.B2_BUCKET + '/' + key, url.search.slice(1),
    ...Object.keys(headers).sort().map((k) => `${k}:${headers[k]}`), '',
    signed, payloadHash,
  ].join('\n');
  const scope = `${date}/${region}/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amz, scope, await sha256hex(canon)].join('\n');
  let sk: ArrayBuffer = enc.encode('AWS4' + env.B2_APP_KEY).buffer as ArrayBuffer;
  for (const m of [date, region, 's3', 'aws4_request']) sk = await hmac(sk, m);
  const sigBuf = await hmac(sk, toSign);
  const sig = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  headers['authorization'] =
    `AWS4-HMAC-SHA256 Credential=${env.B2_KEY_ID}/${scope}, SignedHeaders=${signed}, Signature=${sig}`;
  return fetch(url.toString(), { method, headers, body: body ?? undefined });
}

export const onRequest = async (context: any): Promise<Response> => {
  const { request, env } = context;
  const p = context.params?.path;
  const key = (Array.isArray(p) ? p.join('/') : p || '').replace(/^\/+/, '');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (!env.B2_KEY_ID || !env.B2_APP_KEY || !env.B2_BUCKET || !env.B2_ENDPOINT) {
    return new Response(JSON.stringify({ error: 'B2 chưa cấu hình secrets (B2_KEY_ID/B2_APP_KEY)' }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });
  }
  try {
    if (request.method === 'PUT' && key) {
      const ct = request.headers.get('content-type') || 'application/octet-stream';
      const buf = await request.arrayBuffer();
      const r = await s3fetch(env, 'PUT', key, '', buf, ct);
      if (!r.ok) return new Response(JSON.stringify({ error: `B2 upload failed: ${r.status}` }), { status: 502, headers });
      return new Response(JSON.stringify({ success: true, key, bytes: buf.byteLength }), { headers });
    }
    if (request.method === 'GET' && key) {
      const r = await s3fetch(env, 'GET', key, '', undefined, '');
      if (r.status === 404) return new Response(JSON.stringify({ error: 'Không thấy file' }), { status: 404, headers });
      if (!r.ok) return new Response(JSON.stringify({ error: `B2 download failed: ${r.status}` }), { status: 502, headers });
      const out = new Headers(headers);
      const ct = r.headers.get('content-type');
      if (ct) out.set('Content-Type', ct);
      const cl = r.headers.get('content-length');
      if (cl) out.set('Content-Length', cl);
      return new Response(r.body, { headers: out });
    }
    if (request.method === 'DELETE' && key) {
      const r = await s3fetch(env, 'DELETE', key, '', undefined, '');
      if (!r.ok && r.status !== 404 && r.status !== 204)
        return new Response(JSON.stringify({ error: `B2 delete failed: ${r.status}` }), { status: 502, headers });
      return new Response(JSON.stringify({ success: true, key }), { headers });
    }
    if (request.method === 'GET' && !key) {
      const r = await s3fetch(env, 'GET', '', '?list-type=2&max-keys=100', undefined, '');
      const xml = await r.text();
      const files: Array<Record<string, string>> = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)]
        .map((m) => {
          const b = m[1];
          const pick = (t: string) => (b.match(new RegExp(`<${t}>([\\s\\S]*?)<\/${t}>`)) || [])[1] || '';
          return { key: pick('Key'), bytes: pick('Size'), modified: pick('LastModified') };
        })
        .filter((f) => f.key);
      return new Response(JSON.stringify({ success: true, data: files }),
        { headers: { ...headers, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 'Endpoint không tồn tại' }), { status: 404, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};
