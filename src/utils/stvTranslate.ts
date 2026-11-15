// Gọi API dịch của sangtacviet (cùng endpoint với translate.py).
// sangtacviet.com cho phép CORS nên gọi thẳng từ trình duyệt; lỗi mạng/CORS -> thử proxy /api/translate.

const STV_URL = 'https://sangtacviet.com/index.php?ngmar=trans&langhint=chinese';
const PROXY_URL = '/api/translate';
const CHUNK = 2500;

async function post(url: string, content: string): Promise<string> {
  const r = await fetch(url, {
    method: 'POST',
    body: new URLSearchParams({ ajax: 'trans', content })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  let t = await r.text();
  if (t && t.charCodeAt(0) > 65000) t = t.slice(1);
  if (!t || t.includes('spinner-border') || t.includes('Lỗi hệ thống')) throw new Error('API trả về trang lỗi');
  return t;
}

async function call(content: string): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const url of [STV_URL, PROXY_URL]) {
      try {
        return await post(url, content);
      } catch (e) {
        lastErr = e;
      }
    }
    await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw lastErr instanceof Error ? lastErr : new Error('Không gọi được API dịch');
}

/** dịch nhiều dòng, trả về đúng số dòng (giống translate_chunk) */
export async function translateLines(lines: string[]): Promise<string[]> {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const batch: string[] = [];
    let size = 0;
    while (i < lines.length && (batch.length === 0 || size + lines[i].length + 1 <= CHUNK)) {
      batch.push(lines[i]);
      size += lines[i].length + 1;
      i++;
    }
    const res = (await call(batch.join('\n'))).replace(/\n+$/, '').split('\n');
    if (res.length === batch.length) {
      out.push(...res);
    } else {
      for (const ln of batch) {
        out.push(ln.trim() ? (await call(ln)).replace(/\n+$/, '').replace(/\n/g, ' ') : ln);
      }
    }
  }
  return out;
}
