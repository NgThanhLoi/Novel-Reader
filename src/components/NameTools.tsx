import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search, Upload, X, RotateCcw, Ban, Pencil, Check, Loader2, Copy } from 'lucide-react';
import { NameEngine, NameEntry, Segment, capFirst, titleCase } from '../utils/nameEngine';
import { translateLines } from '../utils/stvTranslate';

export interface PanelTheme {
  panel: string; // lớp màu nền/chữ của khung
  border: string;
}

const btn = 'px-3 py-1.5 rounded-lg border border-current/20 text-xs font-semibold hover:bg-current/10 active:scale-95 transition';
const btnPrimary = 'px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold active:scale-95 transition disabled:opacity-40';

// ---------------- đoạn văn: chạm từ bất kỳ để sửa (giống STV) ----------------
export interface TapInfo {
  el: HTMLElement;
  key?: string; // chạm vào name đang có
  sylls?: string[]; // các âm tiết của cụm từ được chạm (chữ thường, bỏ dấu câu)
  focus?: number; // âm tiết được chạm trong sylls
  near?: string[]; // các âm tiết quanh chỗ chạm ('#' = name / ranh giới)
  nearFocus?: number;
  frac: number; // vị trí tương đối của từ trong đoạn (0..1)
  from: number; // khoảng token để tô đỏ
  to: number;
}

interface Tok { s: string; k?: string; w?: boolean; off: number }

const WORD = /[0-9A-Za-zÀ-ỹđĐ]/;
const isCap = (s: string) => { const c = s.replace(/^[^0-9A-Za-zÀ-ỹđĐ]+/, '')[0]; return !!c && c !== c.toLowerCase(); };
const syl = (s: string) => s.toLowerCase().replace(/[^0-9a-zà-ỹđ]/g, '');

function tokenize(segs: Segment[]): Tok[] {
  const out: Tok[] = [];
  let off = 0;
  for (const x of segs) {
    if (x.k) { out.push({ s: x.s, k: x.k, off }); off += x.s.length; continue; }
    for (const p of x.s.split(/(\s+)/)) {
      if (!p) continue;
      out.push({ s: p, w: WORD.test(p), off });
      off += p.length;
    }
  }
  return out;
}

export const SegmentText: React.FC<{
  segs: Segment[];
  editMode: boolean;
  hl?: [number, number] | null;
  onTap?: (t: TapInfo) => void;
}> = ({ segs, editMode, hl, onTap }) => {
  const toks = useMemo(() => (editMode ? tokenize(segs) : null), [segs, editMode]);
  if (!toks) return <>{segs.map(x => x.s).join('')}</>;
  const total = toks.length ? toks[toks.length - 1].off + toks[toks.length - 1].s.length : 1;

  const tap = (i: number, el: HTMLElement) => {
    const t = toks[i];
    const frac = (t.off + t.s.length / 2) / total;
    if (t.k) return onTap?.({ el, key: t.k, frac, from: i, to: i });
    // từ viết hoa: gom cả cụm viết hoa liền kề (tên lạ máy để Hán Việt), dừng ở dấu câu
    let a = i, b = i;
    if (isCap(t.s)) {
      const stopAfter = (s: string) => /[^0-9A-Za-zÀ-ỹđĐ]$/.test(s);
      const stopBefore = (s: string) => /^[^0-9A-Za-zÀ-ỹđĐ]/.test(s);
      while (a - 2 >= 0 && toks[a - 1].s.trim() === '' && toks[a - 2].w && isCap(toks[a - 2].s) && !stopAfter(toks[a - 2].s) && !stopBefore(toks[a].s)) a -= 2;
      while (b + 2 < toks.length && toks[b + 1].s.trim() === '' && toks[b + 2].w && isCap(toks[b + 2].s) && !stopAfter(toks[b].s) && !stopBefore(toks[b + 2].s)) b += 2;
    }
    const idx: number[] = [];
    for (let j = a; j <= b; j += 2) idx.push(j);
    // âm tiết quanh chỗ chạm (dò theo nghĩa)
    const left: string[] = [], right: string[] = [];
    for (let j = i - 1; j >= 0 && left.length < 6; j--) if (toks[j].k) { left.unshift('#'); break; } else if (toks[j].w) left.unshift(syl(toks[j].s));
    for (let j = i + 1; j < toks.length && right.length < 6; j++) if (toks[j].k) { right.push('#'); break; } else if (toks[j].w) right.push(syl(toks[j].s));
    onTap?.({ el, sylls: idx.map(j => syl(toks[j].s)), focus: idx.indexOf(i), near: [...left, syl(t.s), ...right], nearFocus: left.length, frac, from: a, to: b });
  };

  return (
    <>
      {toks.map((t, i) => {
        if (!t.k && !t.w) return <React.Fragment key={i}>{t.s}</React.Fragment>;
        const on = hl && i >= hl[0] && i <= hl[1];
        return (
          <span
            key={i}
            data-tap=""
            onClick={e => { e.stopPropagation(); tap(i, e.currentTarget); }}
            className={`cursor-pointer rounded-sm ${on ? 'bg-red-500/20 text-red-600 dark:text-red-400' : t.k ? 'border-b border-dotted border-amber-500 hover:bg-amber-500/15' : 'hover:bg-current/10'}`}
          >
            {t.s}
          </span>
        );
      })}
    </>
  );
};

// ---------------- hộp sửa name nổi cạnh từ được chạm ----------------
export interface EditCtx {
  z: string; // câu gốc
  start: number; // -1 = chưa dò được, để người dùng chạm chữ Trung
  end: number;
  anchor?: DOMRect | null;
  guess?: number; // không dò được: vị trí ước chừng trong câu gốc để tô gợi ý
  aligning?: boolean; // đang dò theo nghĩa
}

const meaningCache = new Map<string, string>();

function variants(engine: NameEngine, zh: string) {
  const hv = engine.hvName(zh);
  const words = hv.split(' ');
  const t = titleCase(hv);
  const out: Array<{ label: string; v: string; tip?: string }> = [{ label: 'HV', v: t, tip: 'Hán Việt — hoa toàn bộ' }];
  if (words.length >= 2) out.push({ label: 'HV-t', v: [...t.split(' ').slice(0, -1), words[words.length - 1]].join(' '), tip: 'Hán Việt — thường chữ cuối (tông, sơn, gia…)' });
  if (words.length >= 2) out.push({ label: 'Hv', v: capFirst(hv), tip: 'Hán Việt — hoa chữ đầu' });
  out.push({ label: 'hv', v: hv, tip: 'Hán Việt — chữ thường' });
  return out;
}

export const NamePopover: React.FC<{
  engine: NameEngine;
  ctx: EditCtx;
  theme: PanelTheme;
  onSave: (zh: string, v: string | null) => void;
  onReset: (zh: string) => void;
  onClose: () => void;
}> = ({ engine, ctx, theme, onSave, onReset, onClose }) => {
  const { z } = ctx;
  const [sel, setSel] = useState<{ s: number; e: number } | null>(ctx.start >= 0 ? { s: ctx.start, e: ctx.end } : null);
  const zh = sel ? z.slice(sel.s, sel.e) : '';
  const cur = zh ? engine.current(zh) : undefined;
  const base = zh ? engine.baseValue(zh) : undefined;
  const user = zh ? engine.userEntry(zh) : undefined;
  const changedFromBase = !!user && (base === undefined ? user.v !== null : user.v !== base);
  const [custom, setCustom] = useState('');
  const [meaning, setMeaning] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<React.CSSProperties>({ visibility: 'hidden' });

  const cover = useMemo(() => {
    const a: Array<{ start: number; end: number } | null> = Array(z.length).fill(null);
    for (const sp of engine.spans(z)) for (let i = sp.start; i < sp.end; i++) a[i] = sp;
    return a;
  }, [engine, z]);

  // giá trị gợi ý trong ô tự nhập + dịch nghĩa
  useEffect(() => {
    setCustom(zh ? cur ?? titleCase(engine.hvName(zh)) : '');
    setMeaning(null);
    if (!zh) return;
    if (meaningCache.has(zh)) { setMeaning(meaningCache.get(zh)!); return; }
    let alive = true;
    const t = setTimeout(() => {
      translateLines([zh]).then(r => {
        const m = (r[0] || '').trim().replace(/[.。]$/, '');
        meaningCache.set(zh, m);
        if (alive) setMeaning(m);
      }).catch(() => alive && setMeaning(''));
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zh]);

  // vị trí: máy tính -> nổi ngay dưới/trên từ; điện thoại -> neo đáy màn hình, cuộn từ lên cho khỏi bị che
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const W = window.innerWidth, H = window.innerHeight, h = box.offsetHeight;
    const r = ctx.anchor;
    if (W < 640 || !r) {
      setPos(W < 640 ? { left: 0, right: 0, bottom: 0 } : { left: (W - box.offsetWidth) / 2, top: Math.max(16, H * 0.15) });
      if (r && W < 640 && r.bottom > H - h - 12) window.scrollBy({ top: r.bottom - (H - h) + 48, behavior: 'smooth' });
      return;
    }
    const w = box.offsetWidth;
    const left = Math.min(Math.max(8, r.left), W - w - 8);
    const top = r.bottom + 6 + h <= H - 8 ? r.bottom + 6 : Math.max(8, r.top - h - 6);
    setPos({ left, top });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);

  // chạm ra ngoài / Esc -> đóng (chạm từ khác thì ReaderView mở lại hộp ở từ đó)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (boxRef.current?.contains(t) || t.closest?.('[data-tap]')) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const id = setTimeout(() => document.addEventListener('click', onDoc), 0);
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(id); document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  useEffect(() => {
    stripRef.current?.querySelector('[data-sel],[data-guess]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [sel?.s]);

  const tapChar = (i: number) => {
    const k = cover[i];
    if (!sel) return setSel(k ? { s: k.start, e: k.end } : { s: i, e: i + 1 });
    if (i >= sel.s && i < sel.e) return setSel(k && (k.start !== sel.s || k.end !== sel.e) ? { s: k.start, e: k.end } : { s: i, e: i + 1 });
    setSel({ s: Math.min(sel.s, i), e: Math.max(sel.e, i + 1) });
  };
  // mở rộng nuốt trọn name kề bên
  const grow = (side: -1 | 1) => sel && setSel(side < 0
    ? { s: cover[sel.s - 1]?.start ?? Math.max(0, sel.s - 1), e: sel.e }
    : { s: sel.s, e: cover[sel.e]?.end ?? Math.min(z.length, sel.e + 1) });
  const shrink = (side: -1 | 1) => sel && sel.e - sel.s > 1 && setSel(side < 0 ? { s: sel.s + 1, e: sel.e } : { s: sel.s, e: sel.e - 1 });

  const save = (v: string | null) => { if (!zh) return; if (v !== null && !v.trim()) return; onSave(zh, v === null ? null : v.trim()); onClose(); };

  const rows = useMemo(() => {
    if (!zh) return [];
    const list: Array<{ label: string; v: string; tip?: string }> = [];
    if (cur !== undefined) list.push({ label: 'Đang', v: cur, tip: 'Name đang dùng' });
    if (base !== undefined && base !== cur) list.push({ label: 'Gốc', v: base, tip: 'Name mặc định của gói' });
    list.push(...variants(engine, zh));
    const seen = new Set<string>();
    return list.filter(r => (seen.has(r.v) ? false : (seen.add(r.v), true)));
  }, [engine, zh, cur, base]);

  const ctxFrom = sel ? Math.max(0, sel.s - 40) : 0;
  const ctxTo = sel ? Math.min(z.length, sel.e + 40) : z.length;

  return (
    <div
      ref={boxRef}
      style={pos}
      onClick={e => e.stopPropagation()}
      className={`fixed z-[60] w-full sm:w-[24rem] max-h-[62vh] overflow-y-auto rounded-t-2xl sm:rounded-xl border shadow-2xl text-sm ${theme.panel} ${theme.border}`}
    >
      {/* thanh trên: mở rộng / thu hẹp / đóng */}
      <div className="sticky top-0 z-10 flex items-center gap-1 px-2 py-1.5 border-b border-current/10 bg-inherit">
        <button className={`${btn} px-2`} disabled={!sel || sel.s <= 0} onClick={() => grow(-1)} title="Mở rộng sang trái">
          <ChevronLeft className="w-3.5 h-3.5 inline -mt-0.5" />Mở rộng
        </button>
        <button className={`${btn} px-2`} disabled={!sel || sel.e - sel.s <= 1} onClick={() => shrink(-1)} title="Bớt chữ trái">−</button>
        <div className="flex-1 min-w-0 text-center">
          <div className="text-lg font-bold leading-tight truncate">{zh || '—'}</div>
        </div>
        <button className={`${btn} px-2`} disabled={!sel || sel.e - sel.s <= 1} onClick={() => shrink(1)} title="Bớt chữ phải">−</button>
        <button className={`${btn} px-2`} disabled={!sel || sel.e >= z.length} onClick={() => grow(1)} title="Mở rộng sang phải">
          Mở rộng<ChevronRight className="w-3.5 h-3.5 inline -mt-0.5" />
        </button>
        <button onClick={onClose} className="p-1.5 opacity-60 hover:opacity-100" title="Đóng"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-3 space-y-3">
        {/* câu gốc: chạm chữ để chọn lại cụm */}
        <div ref={stripRef} className="max-h-[4.6rem] overflow-y-auto text-lg leading-8 tracking-wide select-none rounded-lg bg-current/[0.04] px-2">
          {ctxFrom > 0 && <span className="opacity-40">…</span>}
          {[...z.slice(ctxFrom, ctxTo)].map((c, j) => {
            const i = j + ctxFrom;
            const inSel = sel && i >= sel.s && i < sel.e;
            const near = !sel && ctx.guess !== undefined && Math.abs(i - ctx.guess) <= 4;
            return (
              <span
                key={i}
                data-sel={inSel && i === sel!.s ? '' : undefined}
                data-guess={near && i === Math.max(0, ctx.guess! - 4) ? '' : undefined}
                title={engine.meta.hv[c] || ''}
                onClick={() => tapChar(i)}
                className={`cursor-pointer rounded px-[1px] ${inSel ? 'bg-amber-500 text-white' : near ? 'bg-amber-500/20' : cover[i] ? 'border-b-2 border-amber-500/50' : 'hover:bg-current/10'}`}
              >
                {c}
              </span>
            );
          })}
          {ctxTo < z.length && <span className="opacity-40">…</span>}
        </div>

        {!sel ? (
          ctx.aligning ? (
            <p className="text-xs opacity-70"><Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1" />Đang dò chữ gốc…</p>
          ) : <p className="text-xs opacity-70">Không dò được chữ gốc của từ này (vùng tô nhạt là chỗ ước chừng) — chạm chữ Trung ở trên, chữ đầu rồi chữ cuối, để chọn cụm.</p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs opacity-70">
              <span className="truncate">{engine.hv(zh)}</span>
              <button className="ml-auto p-1 hover:opacity-100" title="Sao chép chữ Trung" onClick={() => navigator.clipboard?.writeText(zh)}>
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* gợi ý: chạm là lưu luôn */}
            <div className="rounded-lg border border-current/15 divide-y divide-current/10 overflow-hidden">
              {rows.map(r => (
                <div key={r.label + r.v} className="flex items-stretch">
                  <span title={r.tip} className="w-12 shrink-0 grid place-items-center text-[11px] font-bold bg-emerald-600/80 text-white">{r.label}</span>
                  <button className="flex-1 min-w-0 text-left px-2.5 py-2 hover:bg-amber-500/10 active:bg-amber-500/20" onClick={() => save(r.v)} title="Chạm để lưu">
                    <span className="font-semibold">{r.v}</span>
                    {r.v === cur && <Check className="w-3.5 h-3.5 inline ml-1.5 text-emerald-600" />}
                    
                  </button>
                  <button className="px-2.5 opacity-50 hover:opacity-100" title="Sửa từ gợi ý này" onClick={() => setCustom(r.v)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-stretch">
                <span className="w-12 shrink-0 grid place-items-center text-[11px] font-bold bg-sky-600/80 text-white" title="Dịch nghĩa (máy dịch)">Nghĩa</span>
                {meaning === null ? (
                  <span className="flex-1 px-2.5 py-2 opacity-50"><Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1" />đang dịch…</span>
                ) : (
                  <button className="flex-1 min-w-0 text-left px-2.5 py-2 hover:bg-amber-500/10 disabled:opacity-50" disabled={!meaning} onClick={() => meaning && save(meaning)}>
                    {meaning || 'không dịch được'}
                  </button>
                )}
                {meaning && (
                  <button className="px-2.5 opacity-50 hover:opacity-100" title="Sửa từ gợi ý này" onClick={() => setCustom(meaning)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* tự nhập */}
            <div className="flex gap-1.5">
              <input
                value={custom}
                onChange={e => setCustom(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(custom); }}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-current/25 bg-transparent text-base focus:outline-none focus:border-amber-500"
                placeholder="Tự nhập name…"
              />
              <button className={btnPrimary} disabled={!custom.trim()} onClick={() => save(custom)}>Lưu</button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {cur !== undefined && (
                <button className={btn} title="Không phải tên riêng — để máy dịch nghĩa" onClick={() => save(null)}>
                  <Ban className="w-3.5 h-3.5 inline mr-1" />Không phải name
                </button>
              )}
              {changedFromBase && (
                <button className={btn} onClick={() => { onReset(zh); onClose(); }}>
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" />Về mặc định{base !== undefined ? `: ${base}` : ''}
                </button>
              )}
              {cur === undefined && (
                <span className="text-[11px] opacity-60">Name mới — các đoạn có 「{zh}」 sẽ được dịch lại.</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ---------------- danh sách name ----------------
export const NameListDrawer: React.FC<{
  engine: NameEngine;
  novelTitle: string;
  theme: PanelTheme;
  onEdit: (zh: string) => void;
  onReset: (zh: string) => void;
  onImport: (changes: Record<string, string | null>) => void;
  onClose: () => void;
}> = ({ engine, novelTitle, theme, onEdit, onReset, onImport, onClose }) => {
  const [tab, setTab] = useState<'edited' | 'all'>('edited');
  const [q, setQ] = useState('');
  const [importText, setImportText] = useState<string | null>(null);

  const edited = useMemo(() => {
    return (Object.entries(engine.doc.entries) as Array<[string, NameEntry]>)
      .filter(([k, e]) => {
        const b = engine.baseValue(k);
        return b === undefined ? e.v !== null : e.v !== b;
      })
      .sort((a, b) => b[1].t - a[1].t)
      .map(([k, e]) => ({ zh: k, v: e.v, base: engine.baseValue(k) }));
  }, [engine]);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (tab === 'edited') {
      return edited.filter(r => !ql || r.zh.includes(q.trim()) || (r.v || '').toLowerCase().includes(ql));
    }
    if (!ql) return [];
    const out: Array<{ zh: string; v: string | null; base?: string }> = [];
    const seen = new Set<string>();
    const consider = (k: string) => {
      if (seen.has(k)) return; seen.add(k);
      const v = engine.current(k) ?? null;
      if (k.includes(q.trim()) || (v || '').toLowerCase().includes(ql)) out.push({ zh: k, v, base: engine.baseValue(k) });
    };
    for (const k of Object.keys(engine.doc.entries)) consider(k);
    for (const k of engine.meta.keys) { consider(k); if (out.length >= 200) break; }
    return out;
  }, [tab, q, edited, engine]);

  const exportTxt = () => {
    const lines = edited.map(r => (r.v === null ? `# bỏ name: ${r.zh}` : `${r.zh}=${r.v}`));
    const blob = new Blob([`# Name sửa trong Novel-Reader — ${novelTitle}\n` + lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `name-${engine.meta.novelId}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = () => {
    const changes: Record<string, string | null> = {};
    for (const raw of (importText || '').split('\n')) {
      const l = raw.trim();
      if (!l || l.startsWith('#') || !l.includes('=')) continue;
      const [k, ...rest] = l.split('=');
      const v = rest.join('=').trim();
      if (k.trim()) changes[k.trim()] = v || null;
    }
    if (Object.keys(changes).length) onImport(changes);
    setImportText(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={onClose}>
      <div className={`w-full max-w-md h-full shadow-2xl p-4 flex flex-col text-sm ${theme.panel}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-current/10">
          <h3 className="font-bold">Name — {novelTitle}</h3>
          <button onClick={onClose} className="p-1 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-1.5 py-3">
          <button className={`${btn} ${tab === 'edited' ? 'bg-amber-500/20 border-amber-500/50' : ''}`} onClick={() => setTab('edited')}>
            Đã sửa ({edited.length})
          </button>
          <button className={`${btn} ${tab === 'all' ? 'bg-amber-500/20 border-amber-500/50' : ''}`} onClick={() => setTab('all')}>
            Tìm trong {engine.meta.keys.length.toLocaleString()} name
          </button>
          <div className="flex-1" />
          <button className={btn} title="Tải xuống dạng 中文=Việt (gộp vào glossary)" onClick={exportTxt}><Download className="w-3.5 h-3.5" /></button>
          <button className={btn} title="Nhập nhiều name" onClick={() => setImportText('')}><Upload className="w-3.5 h-3.5" /></button>
        </div>
        <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-current/20 mb-2">
          <Search className="w-3.5 h-3.5 opacity-60" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm chữ Trung hoặc tên Việt…" className="flex-1 bg-transparent focus:outline-none text-xs" />
        </label>

        {importText !== null ? (
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-[11px] opacity-70">Mỗi dòng một name: <code>中文=Việt</code>. Để trống bên phải (<code>中文=</code>) là bỏ name.</p>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} className="flex-1 min-h-40 p-2 rounded-lg border border-current/20 bg-transparent font-mono text-xs focus:outline-none" />
            <div className="flex justify-end gap-1.5">
              <button className={btn} onClick={() => setImportText(null)}>Hủy</button>
              <button className={btnPrimary} onClick={doImport}>Nhập</button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
            {tab === 'all' && !q.trim() && <p className="text-xs opacity-60 p-2">Gõ để tìm.</p>}
            {tab === 'edited' && !edited.length && <p className="text-xs opacity-60 p-2">Chưa sửa name nào. Bật chế độ sửa name (biểu tượng bút) rồi chạm vào từ bất kỳ trong truyện.</p>}
            {rows.map(r => (
              <div key={r.zh} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-current/5">
                <button className="flex-1 text-left min-w-0" data-tap="" onClick={() => onEdit(r.zh)}>
                  <span className="font-semibold">{r.zh}</span>
                  <span className="opacity-50"> = </span>
                  <span className={r.v === null ? 'italic opacity-60' : ''}>{r.v ?? '(bỏ name)'}</span>
                  {r.base !== undefined && r.base !== r.v && <span className="block text-[11px] opacity-50 truncate">mặc định: {r.base}</span>}
                </button>
                {tab === 'edited' && (
                  <button className="p-1 opacity-60 hover:opacity-100" title="Về mặc định" onClick={() => onReset(r.zh)}>
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
