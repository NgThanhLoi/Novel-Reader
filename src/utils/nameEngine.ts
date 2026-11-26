// Name engine: render bản dịch có mã giữ chỗ (JQ<id>JQ) theo bộ name hiện tại,
// và chuẩn bị câu gốc tiếng Trung để dịch lại khi thêm/bỏ name.
// Port từ build_reader_pack.py / translate.py (mode xuanjian) — giữ đúng thứ tự xử lý.

export interface BiMeta {
  novelId: string;
  marker: string;
  keys: string[]; // id -> chữ Trung (glossary gốc)
  vals: string[]; // id -> name Việt (glossary gốc)
  hv: Record<string, string>; // chữ -> Hán Việt
  chapterCount: number;
  importedAt: string;
  titles?: string[]; // tiêu đề chương (có mã) — cho mục lục
  fixes?: Record<string, string>; // sửa tay: cụm Trung -> chữ Việt chèn thẳng trước khi dịch
  version?: string; // phiên bản gói (build_reader_pack.py) — khác bản trên cloud thì tải lại
}

export interface NameEntry {
  v: string | null; // null = bỏ name (không phải tên riêng, để máy dịch)
  t: number; // thời điểm sửa (ms) — bản mới hơn thắng khi đồng bộ
  p?: 1; // cụm từ (sửa nghĩa, không phải tên riêng): không gạch chân như name, gợi ý theo nghĩa
}

export interface NameDoc {
  entries: Record<string, NameEntry>;
  updatedAt: number;
}

export interface Segment {
  s: string;
  k?: string; // chữ Trung nếu đoạn này là name / cụm từ
  ph?: boolean; // là cụm từ người dùng sửa nghĩa
}

const LATIN = /[A-Za-zÀ-ɏḀ-ỿ]/;
const isLatin = (ch: string) => !!ch && LATIN.test(ch);

// ---- tiền xử lý (giống preprocess_xj, z đã qua xj_clean) ----
const CNUM = /^([\s　]*)第([零〇一二三四五六七八九十百千两]+)章/;
const SPEECH = /(回答|询问|反问|问|答|喝|骂|说|地)?道[：:]/g;
const SPEECH_VI: Record<string, string> = {
  回答: 'trả lời:', 询问: 'hỏi:', 反问: 'hỏi ngược lại:', 问: 'hỏi:',
  答: 'đáp:', 喝: 'quát:', 骂: 'mắng:'
};
const SUN = /(?<![阴【『《])太阳(?=一般|般|西|东升|升起|初升|落山|下山|底下|高照|高悬|毒辣|晒)/g;
const CD: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const UNIT: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };

function cn2int(s: string): number {
  let total = 0, cur = 0;
  for (const c of s) {
    if (c in CD) cur = CD[c];
    else { total += (cur || 1) * UNIT[c]; cur = 0; }
  }
  return total + cur;
}

// ---- hậu xử lý (XJ_POST + XJ_SENT_START) ----
const SENT_START = /(^[\s　]*|[「『“‘])([a-zà-ỹđ])/g;
export function postprocess(s: string): string {
  return s
    .replace(/(?<=\S) {2,}/g, ' ')
    .replace(/ +(?=[,.!?;:…」』】》）)’])/g, '')
    .replace(/(?<=[「『【《（(‘]) +/g, '')
    .replace(SENT_START, (_m, a, b) => a + b.toUpperCase())
    .replace(/^(Chương \d+: )([a-zà-ỹđ])/, (_m, a, b) => a + b.toUpperCase())
    .replace(/^[ \t　]+|[ \t　]+$/g, '')
    .replace(/「/g, '“').replace(/」/g, '”') // lời thoại kiểu Việt; 『』 giữ cho tên thần thông
    .replace(/”(?=[0-9A-Za-zÀ-ỹĐđ“《『])/g, '” ')
    .replace(/(?<=[0-9A-Za-zÀ-ỹĐđ:,.!?…])“/g, ' “')
    .replace(/’(?=[0-9A-Za-zÀ-ỹĐđ“‘《『])/g, '’ ')
    .replace(/(?<=[0-9A-Za-zÀ-ỹĐđ:,.!?…])‘/g, ' ‘');
}

/** viết hoa chữ cái đầu (bỏ qua dấu câu đứng trước như 《「) */
export const capFirst = (w: string) => w.replace(/[0-9A-Za-zÀ-ỹđĐ]/, m => m.toUpperCase());
export const titleCase = (s: string) => s.split(' ').map(capFirst).join(' ');

/** bỏ dấu (so khớp lỏng: "thủy"/"thuỷ", "hòa"/"hoà") */
export const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

export class NameEngine {
  readonly meta: BiMeta;
  readonly doc: NameDoc;
  private base = new Map<string, string>();
  private active = new Map<string, string>();
  private first = new Map<string, number[]>();
  readonly dynKeys: string[] = []; // khóa làm đổi cách tách câu -> đoạn chứa nó phải dịch lại
  private markerRe: RegExp;
  private fixes: Map<string, string>;
  private phrases = new Set<string>();

  constructor(meta: BiMeta, doc: NameDoc) {
    this.meta = meta;
    this.doc = doc;
    meta.keys.forEach((k, i) => this.base.set(k, meta.vals[i]));
    for (const [k, v] of this.base) this.active.set(k, v);
    for (const [k, e] of Object.entries(doc.entries)) {
      if (e.v === null) {
        if (this.base.has(k)) this.dynKeys.push(k);
        this.active.delete(k);
      } else {
        if (!this.base.has(k)) this.dynKeys.push(k);
        this.active.set(k, e.v);
        if (e.p) this.phrases.add(k);
      }
    }
    this.fixes = new Map(Object.entries(meta.fixes || {}));
    const lens = new Map<string, Set<number>>();
    for (const k of [...this.active.keys(), ...this.fixes.keys()]) {
      if (!lens.has(k[0])) lens.set(k[0], new Set());
      lens.get(k[0])!.add(k.length);
    }
    for (const [c, s] of lens) this.first.set(c, [...s].sort((a, b) => b - a));
    const m = meta.marker;
    this.markerRe = new RegExp(`${m}(\\d+)${m}`, 'g');
  }

  hv(zh: string): string {
    return [...zh].map(c => (this.meta.hv[c] || c).split('/')[0]).join(' ');
  }

  /** Hán Việt kiểu tên: ký tự không có âm (dấu câu, 《》…) dính liền, không chèn dấu cách */
  hvName(zh: string): string {
    let out = '';
    let prevWord = false;
    for (const c of zh) {
      const r = this.meta.hv[c];
      if (r) { out += (prevWord ? ' ' : '') + r.split('/')[0]; prevWord = true; }
      else { out += c; prevWord = /[0-9A-Za-z]/.test(c); }
    }
    return out.trim();
  }

  /**
   * Dò cụm chữ Trung ứng với các âm tiết Việt vừa chạm (máy dịch để nguyên Hán Việt cho tên lạ).
   * sylls: âm tiết (thường) của cụm từ; focus: âm tiết được chạm; frac: vị trí tương đối trong đoạn.
   * Trả về null nếu không khớp được chữ nào.
   */
  locate(z: string, sylls: string[], focus: number, frac: number): { start: number; end: number } | null {
    const reads = [...z].map(c => (this.meta.hv[c] || '').split('/').filter(Boolean));
    const expect = frac * z.length;
    const find = (ss: string[], loose: boolean) => {
      const eq = (a: string, b: string) => (loose ? fold(a) === fold(b) : a === b);
      let best = -1, bestD = Infinity;
      for (let i = 0; i + ss.length <= z.length; i++) {
        if (!ss.every((s, j) => reads[i + j].some(r => eq(r, s)))) continue;
        const d = Math.abs(i - expect);
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    };
    for (const loose of [false, true]) {
      // cả cụm, rồi co dần về quanh âm tiết được chạm
      for (let len = sylls.length; len >= 1; len--) {
        for (let a = Math.max(0, focus - len + 1); a <= focus && a + len <= sylls.length; a++) {
          const i = find(sylls.slice(a, a + len), loose);
          if (i >= 0) return { start: i, end: i + len };
        }
      }
    }
    return null;
  }

  isBase(zh: string) { return this.base.has(zh); }
  baseValue(zh: string) { return this.base.get(zh); }
  userEntry(zh: string): NameEntry | undefined { return this.doc.entries[zh]; }
  current(zh: string): string | undefined { return this.active.get(zh); }
  isPhrase(zh: string) { return this.phrases.has(zh); }

  /** giá trị hiển thị cho một mã (kể cả name đã bị bỏ nhưng đoạn chưa kịp dịch lại) */
  display(zh: string): string {
    return this.active.get(zh) ?? this.base.get(zh) ?? titleCase(this.hv(zh));
  }

  /** chữ ký các khóa động có trong câu — rỗng = dùng bản dịch gốc */
  signature(z: string): string {
    if (!this.dynKeys.length) return '';
    const hit: string[] = [];
    for (const k of this.dynKeys) if (z.includes(k)) hit.push(k + (this.active.has(k) ? '+' : '-'));
    return hit.sort().join('|');
  }

  /** câu gốc -> chuỗi gửi API (mã giữ chỗ đánh số cục bộ) + danh sách khóa theo số */
  prepare(z: string): { text: string; keys: string[] } {
    const M = this.meta.marker;
    let s = z.replace(CNUM, (_m, a, b) => `${a}第${cn2int(b)}章`);
    s = s.replace(/第(\d+)章/g, 'Chương $1:');
    s = s.replace(SPEECH, (_m, a) => (a && SPEECH_VI[a]) || 'nói:');
    s = s.replace(SUN, ' mặt trời ');
    const keys: string[] = [];
    const idOf = new Map<string, number>();
    let out = '';
    let i = 0;
    const n = s.length;
    while (i < n) {
      const lens = this.first.get(s[i]);
      let matched = false;
      if (lens) {
        for (const L of lens) {
          const k = s.slice(i, i + L);
          const fix = this.fixes.get(k);
          if (fix !== undefined || this.active.has(k)) {
            let v: string;
            if (fix !== undefined) {
              v = fix;
            } else {
              let id = idOf.get(k);
              if (id === undefined) { id = keys.length; keys.push(k); idOf.set(k, id); }
              v = `${M}${id}${M}`;
            }
            if (isLatin(out.slice(-1)) && isLatin(v.slice(0, 1))) v = ' ' + v;
            if (i + L < n && isLatin(s[i + L]) && isLatin(v.slice(-1))) v = v + ' ';
            out += v;
            i += L;
            matched = true;
            break;
          }
        }
      }
      if (!matched) { out += s[i]; i++; }
    }
    return { text: out, keys };
  }

  /** các cụm trong câu gốc đang khớp name (khớp dài nhất) — để tô trong bảng chữ gốc */
  spans(z: string): Array<{ start: number; end: number; key: string }> {
    const res: Array<{ start: number; end: number; key: string }> = [];
    let i = 0;
    while (i < z.length) {
      const lens = this.first.get(z[i]);
      let L0 = 0;
      if (lens) for (const L of lens) if (this.active.has(z.slice(i, i + L))) { L0 = L; break; }
      if (L0) { res.push({ start: i, end: i + L0, key: z.slice(i, i + L0) }); i += L0; } else i++;
    }
    return res;
  }

  /** bản dịch có mã -> các đoạn chữ / name để hiển thị */
  render(text: string, keys: string[]): Segment[] {
    const segs: Segment[] = [];
    let last = 0;
    let acc = '';
    this.markerRe.lastIndex = 0;
    for (let m = this.markerRe.exec(text); m; m = this.markerRe.exec(text)) {
      if (m.index > last) { const t = text.slice(last, m.index); segs.push({ s: t }); acc += t; }
      const k = keys[parseInt(m[1], 10)];
      let v = k !== undefined ? this.display(k) : m[0];
      // đầu dòng / sau mở ngoặc thoại -> viết hoa chữ đầu
      if (v && /(^[\s　]*|[「『“‘]|^Chương \d+: )$/.test(acc)) v = v[0].toUpperCase() + v.slice(1);
      segs.push(k !== undefined ? (this.phrases.has(k) ? { s: v, k, ph: true } : { s: v, k }) : { s: v });
      acc += v;
      last = m.index + m[0].length;
    }
    if (last < text.length) segs.push({ s: text.slice(last) });
    return segs;
  }

  plain(text: string, keys: string[]): string {
    return this.render(text, keys).map(x => x.s).join('');
  }
}
