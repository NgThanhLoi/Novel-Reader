import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BiMeta, NameDoc, NameEngine, Segment, postprocess } from '../utils/nameEngine';
import {
  ChapterOverlay, PackChapter, ensurePack, getChapter, getNames, getOverlay,
  saveNames, saveOverlay, syncNames
} from '../utils/bilingual';
import { translateLines } from '../utils/stvTranslate';

interface Loaded {
  idx: number;
  chapter: PackChapter;
  overlay: ChapterOverlay;
}

export interface NamesView {
  title: Segment[];
  paras: Segment[][];
  plain: string; // toàn chương dạng chữ (cho TTS / bookmark)
}

export function useNames(novelId: string, chapterIdx: number) {
  const [meta, setMeta] = useState<BiMeta | null>(null);
  const [doc, setDoc] = useState<NameDoc | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const docRef = useRef<NameDoc | null>(null);
  docRef.current = doc;

  const engine = useMemo(() => (meta && doc ? new NameEngine(meta, doc) : null), [meta, doc]);

  // gói + bộ name của truyện
  useEffect(() => {
    let alive = true;
    setMeta(null); setDoc(null); setLoaded(null); setError(null);
    (async () => {
      const m = await ensurePack(novelId, s => alive && setStatus(s));
      if (!alive) return;
      setStatus(null);
      if (!m) return;
      const d = await getNames(novelId);
      if (!alive) return;
      setMeta(m); setDoc(d);
      const merged = await syncNames(novelId, d);
      if (alive && Object.keys(merged.entries).some(k => d.entries[k]?.t !== merged.entries[k].t)) {
        setDoc(merged);
      }
    })().catch(e => alive && setError(String(e?.message || e)));
    return () => { alive = false; };
  }, [novelId]);

  // chương hiện tại
  useEffect(() => {
    if (!meta) return;
    let alive = true;
    (async () => {
      const [c, o] = await Promise.all([getChapter(novelId, chapterIdx), getOverlay(novelId, chapterIdx)]);
      if (alive) setLoaded(c ? { idx: chapterIdx, chapter: c, overlay: o } : null);
    })();
    return () => { alive = false; };
  }, [meta, novelId, chapterIdx]);

  // dịch lại các đoạn có name mới thêm / name bị bỏ
  useEffect(() => {
    if (!engine || !loaded) return;
    let alive = true;
    const { idx, chapter } = loaded;
    const next: ChapterOverlay = { ...loaded.overlay };
    const items: Array<{ i: number; z: string; sig: string }> = [];
    let dropped = false;
    const all = [{ i: -1, z: chapter.tz }, ...chapter.z.map((z, i) => ({ i, z }))];
    for (const { i, z } of all) {
      const sig = engine.signature(z);
      if (!sig) {
        if (next[i]) { delete next[i]; dropped = true; }
      } else if (next[i]?.sig !== sig) {
        items.push({ i, z, sig });
      }
    }
    if (!items.length) {
      if (dropped) {
        setLoaded({ idx, chapter, overlay: next });
        saveOverlay(novelId, idx, next).catch(() => {});
      }
      return;
    }
    setStatus(`Đang dịch lại ${items.length} đoạn…`);
    setError(null);
    (async () => {
      const preps = items.map(it => engine.prepare(it.z));
      const res = await translateLines(preps.map(p => p.text));
      if (!alive) return;
      items.forEach((it, j) => { next[it.i] = { v: postprocess(res[j] || ''), keys: preps[j].keys, sig: it.sig }; });
      setLoaded({ idx, chapter, overlay: next });
      setStatus(null);
      await saveOverlay(novelId, idx, next);
    })().catch(e => {
      if (!alive) return;
      setStatus(null);
      setError(`Không dịch lại được (${e?.message || e}). Đang hiện bản dịch cũ.`);
    });
    return () => { alive = false; };
  }, [engine, loaded, novelId]);

  const view: NamesView | null = useMemo(() => {
    if (!engine || !meta || !loaded || loaded.idx !== chapterIdx) return null;
    const seg = (i: number, base: string) => {
      const o = loaded.overlay[i];
      return o ? engine.render(o.v, o.keys) : engine.render(base, meta.keys);
    };
    const title = seg(-1, loaded.chapter.t);
    const paras = loaded.chapter.p.map((p, i) => seg(i, p));
    const txt = (s: Segment[]) => s.map(x => x.s).join('');
    return { title, paras, plain: [txt(title), ...paras.map(txt)].join('\n\n') };
  }, [engine, meta, loaded, chapterIdx]);

  // ---- sửa name ----
  const syncTimer = useRef<number | null>(null);
  const scheduleSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(async () => {
      const cur = docRef.current;
      if (!cur) return;
      const merged = await syncNames(novelId, cur);
      if (docRef.current === cur && Object.keys(merged.entries).some(k => cur.entries[k]?.t !== merged.entries[k].t)) {
        setDoc(merged);
      }
    }, 3000);
  }, [novelId]);

  const setNames = useCallback((changes: Record<string, string | null>) => {
    const cur = docRef.current;
    if (!cur) return;
    const t = Date.now();
    const entries = { ...cur.entries };
    for (const [k, v] of Object.entries(changes)) entries[k] = { v, t };
    const nd: NameDoc = { entries, updatedAt: t };
    docRef.current = nd;
    setDoc(nd);
    saveNames(novelId, nd).catch(() => {});
    scheduleSync();
  }, [novelId, scheduleSync]);

  /** về mặc định: name gốc -> giá trị glossary, name tự thêm -> bỏ */
  const resetName = useCallback((zh: string) => {
    if (!meta) return;
    const i = meta.keys.indexOf(zh);
    setNames({ [zh]: i >= 0 ? meta.vals[i] : null });
  }, [meta, setNames]);

  /** tiêu đề chương i theo bộ name hiện tại (null nếu gói không có) */
  const tocTitle = useCallback((i: number): string | null => {
    const t = meta?.titles?.[i];
    return engine && t !== undefined ? engine.plain(t, meta!.keys) : null;
  }, [engine, meta]);

  return {
    ready: !!view,
    tocTitle,
    engine,
    meta,
    doc,
    view,
    chapter: loaded?.idx === chapterIdx ? loaded.chapter : null,
    status,
    error,
    setNames,
    resetName
  };
}
