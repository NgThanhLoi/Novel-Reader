import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search, Upload, X, RotateCcw, Trash2, Languages } from 'lucide-react';
import { NameEngine, NameEntry, Segment, titleCase } from '../utils/nameEngine';

export interface PanelTheme {
  panel: string; // lớp màu nền/chữ của khung
  border: string;
}

const sheetWrap = 'fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center';
const sheetBox = 'w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border shadow-2xl p-4 text-sm';
const btn = 'px-3 py-1.5 rounded-lg border border-current/20 text-xs font-semibold hover:bg-current/10 active:scale-95 transition';
const btnPrimary = 'px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold active:scale-95 transition';

// ---------------- đoạn văn có name bấm được ----------------
export const SegmentText: React.FC<{
  segs: Segment[];
  editMode: boolean;
  onName?: (key: string) => void;
}> = ({ segs, editMode, onName }) => (
  <>
    {segs.map((x, i) =>
      x.k && editMode ? (
        <span
          key={i}
          data-name={x.k}
          onClick={e => { e.stopPropagation(); onName?.(x.k!); }}
          className="cursor-pointer rounded-sm border-b border-dotted border-amber-500 hover:bg-amber-500/15"
        >
          {x.s}
        </span>
      ) : (
        <React.Fragment key={i}>{x.s}</React.Fragment>
      )
    )}
  </>
);

// ---------------- sửa một name ----------------
export interface EditCtx {
  z: string; // câu gốc chứa cụm
  start: number;
  end: number;
}

export const NameEditor: React.FC<{
  engine: NameEngine;
  ctx: EditCtx;
  theme: PanelTheme;
  onSave: (zh: string, v: string | null) => void;
  onReset: (zh: string) => void;
  onClose: () => void;
}> = ({ engine, ctx, theme, onSave, onReset, onClose }) => {
  const [start, setStart] = useState(ctx.start);
  const [end, setEnd] = useState(ctx.end);
  const zh = ctx.z.slice(start, end);
  const hv = engine.hv(zh);
  const cur = engine.current(zh);
  const user = engine.userEntry(zh);
  const base = engine.baseValue(zh);
  const [val, setVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVal(cur ?? titleCase(hv));
    inputRef.current?.focus();
    inputRef.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zh]);

  const isNew = cur === undefined;
  const changedFromBase = !!user && (base === undefined ? user.v !== null : user.v !== base);
  const save = () => { const v = val.trim(); if (v) { onSave(zh, v); onClose(); } };

  return (
    <div className={sheetWrap} onClick={onClose}>
      <div className={`${sheetBox} ${theme.panel} ${theme.border}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><Languages className="w-4 h-4 text-amber-500" />Sửa name</h3>
          <button onClick={onClose} className="p-1 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>

        {/* cụm chữ gốc + mở rộng / thu hẹp */}
        <div className="flex items-center gap-1.5 mb-1">
          <button className={btn} title="Mở rộng sang trái" disabled={start <= 0} onClick={() => setStart(s => Math.max(0, s - 1))}>
            <ChevronLeft className="w-3.5 h-3.5 inline" />+
          </button>
          <button className={btn} title="Bớt chữ bên trái" disabled={end - start <= 1} onClick={() => setStart(s => s + 1)}>−</button>
          <div className="flex-1 text-center text-2xl font-bold tracking-wider break-all">{zh}</div>
          <button className={btn} title="Bớt chữ bên phải" disabled={end - start <= 1} onClick={() => setEnd(e => e - 1)}>−</button>
          <button className={btn} title="Mở rộng sang phải" disabled={end >= ctx.z.length} onClick={() => setEnd(e => Math.min(ctx.z.length, e + 1))}>
            +<ChevronRight className="w-3.5 h-3.5 inline" />
          </button>
        </div>
        <div className="text-center text-xs opacity-70 mb-3">
          <span className="opacity-60">{ctx.z.slice(Math.max(0, start - 8), start)}</span>
          <span className="text-amber-500 font-bold">{zh}</span>
          <span className="opacity-60">{ctx.z.slice(end, end + 8)}</span>
        </div>

        <dl className="grid grid-cols-[6.5rem_1fr] gap-y-1 text-xs mb-3">
          <dt className="opacity-60">Hán Việt</dt><dd>{hv}</dd>
          <dt className="opacity-60">Đang dùng</dt>
          <dd>{cur ?? <i className="opacity-60">chưa có name (máy dịch)</i>}</dd>
          {base !== undefined && base !== cur && (<><dt className="opacity-60">Mặc định</dt><dd>{base}</dd></>)}
        </dl>

        <input
          ref={inputRef}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onClose(); }}
          className="w-full px-3 py-2 rounded-lg border border-current/25 bg-transparent text-base focus:outline-none focus:border-amber-500"
          placeholder="Nhập name tiếng Việt"
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          <button className={btn} onClick={() => setVal(titleCase(hv))}>Hán Việt Hoa</button>
          <button className={btn} onClick={() => setVal(hv)}>hán việt thường</button>
          <button className={btn} onClick={() => setVal(v => (v ? v[0].toUpperCase() + v.slice(1).toLowerCase() : v))}>Hoa chữ đầu</button>
        </div>

        {isNew && (
          <p className="text-[11px] opacity-70 mt-3">
            Name mới: các đoạn có 「{zh}」 sẽ được dịch lại (chương đang đọc dịch ngay, chương khác dịch khi mở).
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
          <div className="flex gap-1.5">
            {!isNew && (
              <button className={btn} title="Không phải tên riêng — để máy dịch nghĩa" onClick={() => { onSave(zh, null); onClose(); }}>
                <Trash2 className="w-3.5 h-3.5 inline mr-1" />Bỏ name
              </button>
            )}
            {changedFromBase && (
              <button className={btn} onClick={() => { onReset(zh); onClose(); }}>
                <RotateCcw className="w-3.5 h-3.5 inline mr-1" />Mặc định
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            <button className={btn} onClick={onClose}>Hủy</button>
            <button className={btnPrimary} onClick={save}>Lưu</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------- bảng chữ gốc của một đoạn ----------------
export const SourcePanel: React.FC<{
  engine: NameEngine;
  z: string;
  vi: Segment[];
  theme: PanelTheme;
  onPick: (ctx: EditCtx) => void;
  onClose: () => void;
}> = ({ engine, z, vi, theme, onPick, onClose }) => {
  const [sel, setSel] = useState<{ s: number; e: number } | null>(null);
  const cover = useMemo(() => {
    const a: Array<{ start: number; end: number } | null> = Array(z.length).fill(null);
    for (const sp of engine.spans(z)) for (let i = sp.start; i < sp.end; i++) a[i] = sp;
    return a;
  }, [engine, z]);

  const tap = (i: number) => {
    if (!sel) return setSel({ s: i, e: i + 1 });
    if (i >= sel.s && i < sel.e) return setSel({ s: i, e: i + 1 });
    setSel({ s: Math.min(sel.s, i), e: Math.max(sel.e, i + 1) });
  };
  const picked = sel ? z.slice(sel.s, sel.e) : '';

  return (
    <div className={sheetWrap} onClick={onClose}>
      <div className={`${sheetBox} ${theme.panel} ${theme.border}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Câu gốc</h3>
          <button onClick={onClose} className="p-1 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs opacity-75 mb-3 leading-relaxed">{vi.map(x => x.s).join('')}</p>
        <p className="text-[11px] opacity-60 mb-2">
          Chạm chữ đầu rồi chạm chữ cuối để chọn cụm. Chữ gạch chân là name đang có (chạm vào để chọn cả cụm).
        </p>
        <div className="text-xl leading-[2.4rem] tracking-wide select-none">
          {[...z].map((c, i) => {
            const inSel = sel && i >= sel.s && i < sel.e;
            const k = cover[i];
            return (
              <span
                key={i}
                title={engine.meta.hv[c] || ''}
                onClick={() => (k && !sel ? setSel({ s: k.start, e: k.end }) : tap(i))}
                className={`cursor-pointer px-[1px] rounded ${inSel ? 'bg-amber-500 text-white' : k ? 'border-b-2 border-amber-500/60' : 'hover:bg-current/10'}`}
              >
                {c}
              </span>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-current/10">
          <div className="text-xs truncate">
            {picked ? (<><b className="text-base">{picked}</b> <span className="opacity-70">{engine.hv(picked)}</span></>) : <span className="opacity-60">Chưa chọn</span>}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {sel && <button className={btn} onClick={() => setSel(null)}>Bỏ chọn</button>}
            <button className={btnPrimary} disabled={!sel} onClick={() => sel && onPick({ z, start: sel.s, end: sel.e })}>Đặt name…</button>
          </div>
        </div>
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
            {tab === 'edited' && !edited.length && <p className="text-xs opacity-60 p-2">Chưa sửa name nào. Bật chế độ sửa name (biểu tượng bút) rồi chạm vào tên trong truyện.</p>}
            {rows.map(r => (
              <div key={r.zh} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-current/5">
                <button className="flex-1 text-left min-w-0" onClick={() => onEdit(r.zh)}>
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
