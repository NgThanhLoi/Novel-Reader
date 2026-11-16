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

/** dịch một lượt, trả về null nếu API gộp/tách dòng (không gọi lẻ từng dòng) */
export async function translateBatchStrict(lines: string[]): Promise<string[] | null> {
  const res = (await call(lines.join('\n'))).replace(/\n+$/, '').split('\n');
  return res.length === lines.length ? res : null;
}

const alignCache = new Map<string, string>();

/**
 * Dò chữ gốc cho một từ được dịch nghĩa (không phải Hán Việt):
 * dịch các cụm 1–4 chữ quanh vị trí ước chừng, chọn cụm có bản dịch khớp liền mạch
 * với các âm tiết quanh chỗ chạm (phải phủ âm tiết được chạm), ưu tiên cụm dài và gần.
 */
export async function alignByMeaning(
  z: string, guess: number, words: string[], focus: number
): Promise<{ start: number; end: number } | null> {
  const R = 10, a = Math.max(0, guess - R), b = Math.min(z.length, guess + R);
  const cands: Array<{ s: number; e: number; t: string }> = [];
  for (let s = a; s < b; s++) for (let L = 1; L <= 4 && s + L <= b; L++) {
    const t = z.slice(s, s + L);
    if (/[\s，。！？、：；“”「」『』《》（）…—,.!?]/.test(t)) continue;
    cands.push({ s, e: s + L, t });
  }
  const need = [...new Set(cands.map(c => c.t))].filter(t => !alignCache.has(t));
  if (need.length) {
    const out = await translateBatchStrict(need);
    if (!out) return null;
    need.forEach((t, i) => alignCache.set(t, out[i]));
  }
  const fw = words.map(w => w.normalize('NFC').toLowerCase());
  let best: { start: number; end: number } | null = null, bestScore = -Infinity;
  for (const c of cands) {
    const tr = (alignCache.get(c.t) || '').toLowerCase().replace(/[^0-9a-zà-ỹđ\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!tr.length || tr.length > 6) continue;
    for (let p = Math.max(0, focus - tr.length + 1); p <= focus && p + tr.length <= fw.length; p++) {
      if (!tr.every((w, j) => fw[p + j] === w)) continue;
      const score = Math.min(tr.length, 2) * 10 - c.t.length * 2 - Math.abs(c.s - guess) * 0.5; // đủ tin cậy thì lấy cụm ngắn nhất
      if (score > bestScore) { bestScore = score; best = { start: c.s, end: c.e }; }
    }
  }
  return best;
}
