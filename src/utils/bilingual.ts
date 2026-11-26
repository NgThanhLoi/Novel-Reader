// Lưu trữ cho truyện "song ngữ" (gói .nrpack.json.gz do build_reader_pack.py tạo):
// câu gốc + bản dịch có mã giữ chỗ, bộ name người dùng, cache đoạn dịch lại.
// Dùng DB riêng để không phải nâng version DB thư viện chính (nâng version ở đó sẽ xóa store novels).

import { Chapter, Novel } from '../types';
import { BiMeta, NameDoc, NameEngine } from './nameEngine';

export interface PackChapter {
  t: string; // tiêu đề (bản dịch có mã)
  tz: string; // tiêu đề gốc
  p: string[]; // đoạn dịch có mã
  z: string[]; // đoạn gốc
}

interface Pack {
  format: string;
  version?: string;
  novel: { id: string; title: string; author: string; description: string; genres: string[] };
  marker: string;
  keys: string[];
  vals: string[];
  fixes?: Record<string, string>;
  hv: Record<string, string>;
  chapters: PackChapter[];
}

export interface OverlayPara {
  v: string; // bản dịch lại (có mã, đánh số cục bộ)
  keys: string[];
  sig: string;
}
export type ChapterOverlay = Record<number, OverlayPara>; // -1 = tiêu đề

const DB_NAME = 'novel_reader_bilingual';
const S_META = 'meta';
const S_CHAP = 'chapters';
const S_NAMES = 'names';
const S_OVER = 'overlay';

let dbPromise: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        for (const s of [S_META, S_CHAP, S_NAMES, S_OVER]) {
          if (!d.objectStoreNames.contains(s)) d.createObjectStore(s);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}

async function get<T>(store: string, key: string): Promise<T | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = d.transaction(store, 'readonly').objectStore(store).get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
  });
}

async function put(store: string, key: string, value: unknown): Promise<void> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function del(store: string, key: string): Promise<void> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const getMeta = (novelId: string) => get<BiMeta>(S_META, novelId);
export const getChapter = (novelId: string, idx: number) => get<PackChapter>(S_CHAP, `${novelId}:${idx}`);
export const getOverlay = async (novelId: string, idx: number) =>
  (await get<ChapterOverlay>(S_OVER, `${novelId}:${idx}`)) || {};
export const saveOverlay = (novelId: string, idx: number, o: ChapterOverlay) =>
  put(S_OVER, `${novelId}:${idx}`, o);

export async function getNames(novelId: string): Promise<NameDoc> {
  return (await get<NameDoc>(S_NAMES, novelId)) || { entries: {}, updatedAt: 0 };
}
export const saveNames = (novelId: string, doc: NameDoc) => put(S_NAMES, novelId, doc);

export async function deleteBilingual(novelId: string, chapterCount: number): Promise<void> {
  await del(S_META, novelId);
  for (let i = 0; i < chapterCount; i++) {
    await del(S_CHAP, `${novelId}:${i}`);
    await del(S_OVER, `${novelId}:${i}`);
  }
}

// ---------- nhập gói ----------
export function isPackFile(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith('.nrpack.json.gz') || n.endsWith('.nrpack.json') || n.endsWith('.json.gz');
}

async function readPackBlob(blob: Blob, gz: boolean): Promise<Pack> {
  const stream = gz ? blob.stream().pipeThrough(new DecompressionStream('gzip')) : blob.stream();
  const text = await new Response(stream).text();
  const pack = JSON.parse(text) as Pack;
  if (pack.format !== 'nr-bilingual/1') throw new Error('Không phải gói song ngữ (.nrpack) hợp lệ');
  return pack;
}

async function storePack(pack: Pack): Promise<BiMeta> {
  const id = pack.novel.id;
  const meta: BiMeta = {
    novelId: id,
    marker: pack.marker,
    keys: pack.keys,
    vals: pack.vals,
    hv: pack.hv,
    chapterCount: pack.chapters.length,
    importedAt: new Date().toISOString(),
    version: pack.version,
    titles: pack.chapters.map(c => c.t),
    fixes: pack.fixes || {}
  };
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction([S_CHAP, S_META, S_OVER], 'readwrite');
    const cs = tx.objectStore(S_CHAP);
    pack.chapters.forEach((c, i) => cs.put(c, `${id}:${i}`));
    // bản dịch gốc mới -> cache dịch lại cũ không còn đúng
    const os = tx.objectStore(S_OVER);
    pack.chapters.forEach((_c, i) => os.delete(`${id}:${i}`));
    tx.objectStore(S_META).put(meta, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return meta;
}

const packUrl = (id: string) => `/api/files/packs/${encodeURIComponent(id)}.nrpack.json.gz`;
const versionUrl = (id: string) => `/api/files/packs/${encodeURIComponent(id)}.version.json`;

/** nhập gói từ file -> Novel (nội dung đã render bằng name mặc định) */
export async function importPackFile(file: File, onStatus?: (s: string) => void): Promise<Novel> {
  const gz = file.name.toLowerCase().endsWith('.gz');
  onStatus?.('Đang giải nén gói…');
  const pack = await readPackBlob(file, gz);
  onStatus?.(`Đang lưu ${pack.chapters.length} chương…`);
  const meta = await storePack(pack);
  // Đưa gói lên cloud (B2) để thiết bị khác tự tải — lỗi thì bỏ qua
  if (gz) {
    fetch(packUrl(pack.novel.id), { method: 'PUT', headers: { 'Content-Type': 'application/gzip' }, body: file })
      .then(r => {
        if (r.ok && pack.version) {
          return fetch(versionUrl(pack.novel.id), {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: pack.version })
          });
        }
      })
      .catch(() => {});
  }
  const engine = new NameEngine(meta, await getNames(meta.novelId));
  const chapters: Chapter[] = pack.chapters.map((c, i) => {
    const content = c.p.map(p => engine.plain(p, meta.keys)).join('\n\n');
    return {
      id: `${meta.novelId}-ch${i}`,
      chapterIndex: i,
      title: engine.plain(c.t, meta.keys),
      content,
      wordCount: content.split(/\s+/).length
    };
  });
  const now = new Date().toISOString();
  return {
    id: pack.novel.id,
    title: pack.novel.title,
    author: pack.novel.author,
    description: pack.novel.description,
    genres: pack.novel.genres,
    language: 'vi',
    sourceFormat: 'json',
    chapters,
    status: 'reading',
    progress: { currentChapterIndex: 0, scrollPercentage: 0, lastReadAt: now, totalTimeSpentSeconds: 0 },
    bookmarks: [],
    totalWords: chapters.reduce((s, c) => s + c.wordCount, 0),
    createdAt: now,
    updatedAt: now
  };
}

interface RemoteManifest {
  version?: string;
  parts?: number; // gói chia nhiều phần (mạng yếu tải 1 file 20MB hay đứt)
  base?: string; // tên phần theo phiên bản (packs/<base>.partN): đẩy bản mới không đè phần của bản đang dùng
}

async function remoteManifest(novelId: string): Promise<RemoteManifest | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(versionUrl(novelId), { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j && typeof j === 'object' ? (j as RemoteManifest) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBlob(url: string, tries = 3): Promise<Blob> {
  let err: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (r.ok) return await r.blob();
      err = new Error(`HTTP ${r.status}`);
    } catch (e) {
      err = e;
    }
    await new Promise(res => setTimeout(res, 1500 * (i + 1)));
  }
  throw err;
}

/** báo cho App biết gói vừa tải về (lần đầu hoặc bản mới) -> cập nhật danh sách chương */
export const packEvents = new EventTarget();

async function downloadPack(novelId: string, manifest: RemoteManifest | null, onStatus?: (s: string) => void): Promise<BiMeta | null> {
  let blob: Blob;
  if (manifest?.parts && manifest.parts > 0) {
    const parts: Blob[] = [];
    for (let i = 0; i < manifest.parts; i++) {
      onStatus?.(`Đang tải gói song ngữ từ cloud (${i + 1}/${manifest.parts})…`);
      const name = manifest.base ? manifest.base : `${novelId}.nrpack`;
      parts.push(await fetchBlob(`/api/files/packs/${encodeURIComponent(name)}.part${i}`));
    }
    blob = new Blob(parts);
  } else {
    onStatus?.('Đang tải gói song ngữ từ cloud…');
    const r = await fetch(packUrl(novelId), { cache: 'no-store' });
    if (!r.ok) return null;
    blob = await r.blob();
  }
  const pack = await readPackBlob(blob, true);
  if (pack.novel.id !== novelId) return null;
  const meta = await storePack(pack);
  packEvents.dispatchEvent(new CustomEvent('updated', { detail: novelId }));
  return meta;
}

/** dựng lại danh sách chương (nội dung chữ, tiêu đề) của truyện từ gói đã lưu */
export async function buildNovelChapters(novelId: string): Promise<Chapter[] | null> {
  const meta = await getMeta(novelId);
  if (!meta) return null;
  const engine = new NameEngine(meta, await getNames(novelId));
  const out: Chapter[] = [];
  for (let i = 0; i < meta.chapterCount; i++) {
    const c = await getChapter(novelId, i);
    if (!c) return null;
    const content = c.p.map(p => engine.plain(p, meta.keys)).join('\n\n');
    out.push({ id: `${novelId}-ch${i}`, chapterIndex: i, title: engine.plain(c.t, meta.keys), content, wordCount: content.split(/\s+/).length });
  }
  return out;
}

const checked = new Set<string>();
/** dữ liệu song ngữ của truyện: chưa có -> tải từ cloud; có rồi -> mỗi phiên kiểm tra
 *  một lần, gói trên cloud mới hơn (build lại sau khi sửa glossary) thì tải lại */
export async function ensurePack(novelId: string, onStatus?: (s: string) => void): Promise<BiMeta | null> {
  const m = await getMeta(novelId).catch(() => undefined);
  if (checked.has(novelId)) return m || null;
  checked.add(novelId);
  const manifest = await remoteManifest(novelId);
  try {
    if (!m) return await downloadPack(novelId, manifest, onStatus);
    if (manifest?.version && manifest.version !== m.version) {
      return (await downloadPack(novelId, manifest, onStatus)) || m;
    }
    return m;
  } catch (e) {
    checked.delete(novelId); // lần mở sau thử tải lại
    if (m) return m; // giữ gói đang có
    if (manifest) throw new Error(`Không tải được gói song ngữ (${(e as Error)?.message || e}) — tải lại trang để thử lại`);
    return null;
  }
}

// ---------- đồng bộ name qua D1 ----------
export function mergeNames(a: NameDoc, b: NameDoc): NameDoc {
  const entries = { ...a.entries };
  for (const [k, e] of Object.entries(b.entries)) {
    if (!entries[k] || e.t > entries[k].t) entries[k] = e;
  }
  return { entries, updatedAt: Math.max(a.updatedAt, b.updatedAt) };
}

/** kéo bộ name trên cloud về, gộp (bản sửa mới hơn thắng), đẩy lại nếu cloud thiếu */
export async function syncNames(novelId: string, local: NameDoc): Promise<NameDoc> {
  const url = `/api/novels/${encodeURIComponent(novelId)}/names`;
  let remote: NameDoc = { entries: {}, updatedAt: 0 };
  try {
    const r = await fetch(url);
    if (r.ok) {
      const j = await r.json();
      if (j?.data?.entries) remote = j.data as NameDoc;
    } else if (r.status !== 404) {
      return local;
    }
  } catch {
    return local;
  }
  const merged = mergeNames(local, remote);
  const changedRemote = Object.entries(merged.entries).some(([k, e]) => remote.entries[k]?.t !== e.t);
  if (changedRemote) {
    fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(merged) })
      .catch(() => {});
  }
  await saveNames(novelId, merged);
  return merged;
}
