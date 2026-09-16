import JSZip from 'jszip';
import { Novel, Chapter, NovelFormat } from '../types';

export interface ParseResult {
  title: string;
  author: string;
  description: string;
  coverUrl?: string;
  genres: string[];
  chapters: Chapter[];
  sourceFormat: NovelFormat;
}

// Clean HTML tags to readable text with proper line breaks
export function cleanHtmlContent(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove scripts, styles, svg, and unneeded tags
  const removeElements = doc.querySelectorAll('script, style, meta, link, head, noscript, iframe');
  removeElements.forEach(el => el.remove());

  // Replace block elements with line breaks before text extraction
  const blocks = doc.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, br, hr, li, blockquote');
  blocks.forEach(el => {
    el.insertAdjacentText('afterend', '\n\n');
  });

  const rawText = doc.body.textContent || '';
  // Normalize whitespace: trim lines and keep max 2 consecutive linebreaks
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

// Calculate word count
export function calculateWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Parse JSON file
export async function parseJsonFile(file: File): Promise<ParseResult> {
  const text = await file.text();
  const data = JSON.parse(text);

  let title = data.title || data.name || file.name.replace(/\.[^/.]+$/, '');
  let author = data.author || data.creator || data.tacGia || 'Khuyết danh';
  let description = data.description || data.summary || data.moTa || 'Chưa có mô tả';
  let genres = Array.isArray(data.genres) ? data.genres : Array.isArray(data.theLoai) ? data.theLoai : ['Tự tải lên'];
  let coverUrl = data.coverUrl || data.cover || data.image;

  let rawChapters: any[] = [];
  if (Array.isArray(data.chapters)) {
    rawChapters = data.chapters;
  } else if (Array.isArray(data.chuong)) {
    rawChapters = data.chuong;
  } else if (typeof data.content === 'string') {
    rawChapters = [{ title: 'Toàn bộ nội dung', content: data.content }];
  } else if (Array.isArray(data)) {
    rawChapters = data;
  }

  const chapters: Chapter[] = rawChapters.map((ch, idx) => {
    const chTitle = ch.title || ch.name || ch.ten || `Chương ${idx + 1}`;
    const chContent = typeof ch === 'string' ? ch : ch.content || ch.noiDung || ch.body || '';
    const cleanContent = chContent.includes('<p>') || chContent.includes('</div>') ? cleanHtmlContent(chContent) : chContent.trim();
    return {
      id: `ch-${idx}-${Date.now()}`,
      chapterIndex: idx,
      title: chTitle,
      content: cleanContent,
      wordCount: calculateWords(cleanContent)
    };
  });

  if (chapters.length === 0) {
    chapters.push({
      id: `ch-0-${Date.now()}`,
      chapterIndex: 0,
      title: 'Chương 1',
      content: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      wordCount: 100
    });
  }

  return {
    title,
    author,
    description,
    coverUrl,
    genres,
    chapters,
    sourceFormat: 'json'
  };
}

// Parse EPUB file using JSZip
export async function parseEpubFile(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Find container.xml to locate rootfile (.opf)
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) {
    throw new Error('File EPUB không hợp lệ (thiếu META-INF/container.xml)');
  }

  const containerXml = await containerFile.async('text');
  const domParser = new DOMParser();
  const containerDoc = domParser.parseFromString(containerXml, 'application/xml');
  const rootfileEl = containerDoc.querySelector('rootfile');
  const opfPath = rootfileEl?.getAttribute('full-path');

  if (!opfPath) {
    throw new Error('Không thể tìm thấy tệp kê khai OPF trong EPUB');
  }

  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`Không tìm thấy tệp OPF tại đường dẫn: ${opfPath}`);
  }

  const opfBaseDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  const opfXml = await opfFile.async('text');
  const opfDoc = domParser.parseFromString(opfXml, 'application/xml');

  // Metadata
  const title = opfDoc.querySelector('title, dc\\:title')?.textContent?.trim() || file.name.replace(/\.[^/.]+$/, '');
  const author = opfDoc.querySelector('creator, dc\\:creator')?.textContent?.trim() || 'Tác giả không rõ';
  const description = opfDoc.querySelector('description, dc\\:description')?.textContent?.trim() || '';
  
  // Genres / Subjects
  const subjects = Array.from(opfDoc.querySelectorAll('subject, dc\\:subject'))
    .map(s => s.textContent?.trim() || '')
    .filter(Boolean);
  const genres = subjects.length > 0 ? subjects : ['EPUB'];

  // Manifest items
  const manifestItems = new Map<string, { href: string; mediaType: string; properties?: string }>();
  opfDoc.querySelectorAll('manifest item').forEach(item => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type') || '';
    const properties = item.getAttribute('properties') || '';
    if (id && href) {
      manifestItems.set(id, { href, mediaType, properties });
    }
  });

  // Extract cover image
  let coverUrl: string | undefined = undefined;
  // Check for cover in manifest item properties or id containing 'cover'
  for (const [id, item] of manifestItems.entries()) {
    if (item.properties.includes('cover-image') || id.toLowerCase().includes('cover')) {
      if (item.mediaType.startsWith('image/')) {
        const coverFilePath = resolvePath(opfBaseDir, item.href);
        const coverZipFile = zip.file(coverFilePath);
        if (coverZipFile) {
          const base64 = await coverZipFile.async('base64');
          coverUrl = `data:${item.mediaType};base64,${base64}`;
          break;
        }
      }
    }
  }

  // Spine itemref order
  const spineItemRefs = Array.from(opfDoc.querySelectorAll('spine itemref'))
    .map(ref => ref.getAttribute('idref'))
    .filter(Boolean) as string[];

  const chapters: Chapter[] = [];
  let chIndex = 0;

  for (const idref of spineItemRefs) {
    const item = manifestItems.get(idref);
    if (!item) continue;
    
    // Only parse HTML / XHTML / XML chapters
    if (item.mediaType.includes('html') || item.mediaType.includes('xml')) {
      const chapterPath = resolvePath(opfBaseDir, item.href);
      const chapterZipFile = zip.file(chapterPath);
      if (!chapterZipFile) continue;

      const rawHtml = await chapterZipFile.async('text');
      const doc = domParser.parseFromString(rawHtml, 'text/html');

      // Attempt to find a chapter heading
      const headingEl = doc.querySelector('h1, h2, h3, title, .chapter-title');
      let chapterTitle = headingEl?.textContent?.trim() || `Chương ${chIndex + 1}`;
      if (chapterTitle.length > 80) {
        chapterTitle = `Chương ${chIndex + 1}`;
      }

      const cleanContent = cleanHtmlContent(rawHtml);
      if (cleanContent.length > 50) {
        chapters.push({
          id: `ch-epub-${chIndex}-${Date.now()}`,
          chapterIndex: chIndex,
          title: chapterTitle,
          content: cleanContent,
          wordCount: calculateWords(cleanContent)
        });
        chIndex++;
      }
    }
  }

  // Fallback if no spine chapters resolved
  if (chapters.length === 0) {
    chapters.push({
      id: `ch-epub-fallback-${Date.now()}`,
      chapterIndex: 0,
      title: 'Nội dung sách',
      content: 'Không tìm thấy nội dung văn bản trong các chương chuẩn của EPUB.',
      wordCount: 15
    });
  }

  return {
    title,
    author,
    description: cleanHtmlContent(description) || 'Sách tải từ tệp EPUB',
    coverUrl,
    genres,
    chapters,
    sourceFormat: 'epub'
  };
}

// Helper: resolve relative path in zip
function resolvePath(base: string, relative: string): string {
  if (relative.startsWith('/')) {
    return relative.slice(1);
  }
  const parts = (base + relative).split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

// PalmDOC decompressor for MOBI format
function decompressPalmDoc(data: Uint8Array): Uint8Array {
  const output: number[] = [];
  let i = 0;
  const len = data.length;

  while (i < len) {
    const byte = data[i++];
    if (byte === 0x00) {
      continue;
    } else if (byte <= 0x08) {
      // Literal next `byte` bytes
      for (let j = 0; j < byte && i < len; j++) {
        output.push(data[i++]);
      }
    } else if (byte <= 0x7f) {
      // Literal single byte
      output.push(byte);
    } else if (byte <= 0xbf) {
      // 2 bytes: distance and length
      if (i < len) {
        const nextByte = data[i++];
        const distance = ((byte & 0x3f) << 3) | (nextByte >> 5);
        const length = (nextByte & 0x1f) + 3;
        const start = output.length - distance;
        for (let k = 0; k < length; k++) {
          if (start + k >= 0 && start + k < output.length) {
            output.push(output[start + k]);
          }
        }
      }
    } else {
      // Space + char
      output.push(0x20); // space
      output.push(byte ^ 0x80);
    }
  }

  return new Uint8Array(output);
}

// Parse MOBI file (Mobipocket / PalmDOC)
export async function parseMobiFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  // Read PDB Header (78 bytes)
  const numRecords = view.getUint16(76);
  if (numRecords === 0) {
    throw new Error('Tệp MOBI không chứa bản ghi dữ liệu (numRecords = 0)');
  }

  // Record list starts at offset 78: each record entry is 8 bytes (4 bytes offset, 4 bytes attributes/id)
  const recordOffsets: number[] = [];
  for (let r = 0; r < numRecords; r++) {
    const offset = view.getUint32(78 + r * 8);
    recordOffsets.push(offset);
  }

  // Record 0 contains PalmDOC & MOBI header
  const rec0Offset = recordOffsets[0];
  const compression = view.getUint16(rec0Offset); // 1 = none, 2 = PalmDOC, 17480 = HUFF/CDIC
  const textRecordCount = view.getUint16(rec0Offset + 8);

  // Read full title from MOBI Header in Record 0
  let mobiTitle = file.name.replace(/\.[^/.]+$/, '');
  try {
    const mobiHeaderOffset = rec0Offset + 16;
    const fullTitleOffset = view.getUint32(mobiHeaderOffset + 68);
    const fullTitleLength = view.getUint32(mobiHeaderOffset + 72);
    if (fullTitleOffset > 0 && fullTitleLength > 0 && fullTitleLength < 256) {
      const titleStart = rec0Offset + fullTitleOffset;
      const titleBytes = uint8.subarray(titleStart, titleStart + fullTitleLength);
      const decoder = new TextDecoder('utf-8');
      const parsedTitle = decoder.decode(titleBytes).trim();
      if (parsedTitle) {
        mobiTitle = parsedTitle;
      }
    }
  } catch (e) {
    console.warn('Could not read extended MOBI title', e);
  }

  // Decompress and collect text records (1 to textRecordCount)
  const chunks: string[] = [];
  const textDecoder = new TextDecoder('utf-8');

  const maxTextRecords = Math.min(textRecordCount, numRecords - 1);
  for (let r = 1; r <= maxTextRecords; r++) {
    const start = recordOffsets[r];
    const end = r < numRecords - 1 ? recordOffsets[r + 1] : buffer.byteLength;
    if (start >= end) continue;

    const recordData = uint8.subarray(start, end);
    if (compression === 2) {
      // PalmDOC
      const decompressed = decompressPalmDoc(recordData);
      chunks.push(textDecoder.decode(decompressed));
    } else if (compression === 1) {
      // No compression
      chunks.push(textDecoder.decode(recordData));
    } else {
      // HUFF/CDIC fallback: decode raw text best effort
      chunks.push(textDecoder.decode(recordData));
    }
  }

  const rawFullText = chunks.join('\n');
  const cleanFullText = cleanHtmlContent(rawFullText);

  // Split into chapters
  const chapters = splitIntoChapters(cleanFullText);

  return {
    title: mobiTitle,
    author: 'Tác giả sách MOBI',
    description: `Sách được nhập từ tệp MOBI (${file.name}). Gồm ${chapters.length} chương.`,
    genres: ['MOBI', 'E-Book'],
    chapters,
    sourceFormat: 'mobi'
  };
}

// Parse TXT file
export async function parseTxtFile(file: File): Promise<ParseResult> {
  const text = await file.text();
  const title = file.name.replace(/\.[^/.]+$/, '');
  const chapters = splitIntoChapters(text);

  return {
    title,
    author: 'Khuyết danh',
    description: `Truyện được trích xuất từ văn bản thuần ${file.name}.`,
    genres: ['Văn bản', 'Truyện chữ'],
    chapters,
    sourceFormat: 'txt'
  };
}

// Intelligent chapter splitter for raw text or converted text
export function splitIntoChapters(fullText: string): Chapter[] {
  const normalized = fullText.replace(/\r\n/g, '\n').trim();
  
  // Chapter detection regex: matches "Chương 1", "Hồi 1", "Chapter 1", "Phần 1", "Quyển 1", "Tiết 1", etc.
  const chapterRegex = /(?:^|\n)(?=(?:Chương|Hồi|Phần|Quyển|Chapter|Tiết)\s*([0-9IVXLCDM\s\:\.\-_]+[^\n]*))/gi;
  
  const rawParts = normalized.split(chapterRegex);
  const chapters: Chapter[] = [];

  if (rawParts.length > 2) {
    let index = 0;
    for (let i = 0; i < rawParts.length; i++) {
      const part = rawParts[i]?.trim();
      if (!part) continue;

      // Extract title (first line) and body
      const firstNewline = part.indexOf('\n');
      let title = `Chương ${index + 1}`;
      let content = part;

      if (firstNewline !== -1) {
        const potentialTitle = part.substring(0, firstNewline).trim();
        if (potentialTitle.length < 90) {
          title = potentialTitle;
          content = part.substring(firstNewline).trim();
        }
      }

      if (content.length > 20) {
        chapters.push({
          id: `ch-split-${index}-${Date.now()}`,
          chapterIndex: index,
          title,
          content,
          wordCount: calculateWords(content)
        });
        index++;
      }
    }
  }

  // Fallback: If no chapter headers matched or very long monolithic text, chunk every ~4,000 words
  if (chapters.length === 0) {
    const paragraphs = normalized.split(/\n\n+/);
    let currentChunk: string[] = [];
    let currentWords = 0;
    let chIdx = 0;

    for (const p of paragraphs) {
      const pWords = calculateWords(p);
      currentChunk.push(p);
      currentWords += pWords;

      if (currentWords >= 3000) {
        const chunkText = currentChunk.join('\n\n');
        chapters.push({
          id: `ch-chunk-${chIdx}-${Date.now()}`,
          chapterIndex: chIdx,
          title: `Phần ${chIdx + 1}`,
          content: chunkText,
          wordCount: currentWords
        });
        chIdx++;
        currentChunk = [];
        currentWords = 0;
      }
    }

    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join('\n\n');
      chapters.push({
        id: `ch-chunk-${chIdx}-${Date.now()}`,
        chapterIndex: chIdx,
        title: chapters.length === 0 ? 'Toàn bộ nội dung' : `Phần ${chIdx + 1}`,
        content: chunkText,
        wordCount: calculateWords(chunkText)
      });
    }
  }

  return chapters;
}
