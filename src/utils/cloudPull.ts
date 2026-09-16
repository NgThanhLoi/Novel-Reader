import { Novel, Chapter, ReadingProgress } from '../types';
import { saveNovel } from './storage';

export interface PullProgress {
  novelTitle: string;
  done: number;
  total: number;
}

// Pull novels from the Cloudflare API that are missing locally.
// Used on first load so the library auto-fills from D1 via same-origin /api/novels.
export async function pullMissingNovels(
  base: string,
  existingIds: Set<string>,
  onProgress: (p: PullProgress) => void
): Promise<Novel[]> {
  const pulled: Novel[] = [];
  const listRes = await fetch(`${base}/api/novels`);
  if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);
  const listJson = await listRes.json();
  const rows = (listJson.data || []) as any[];

  for (const row of rows) {
    if (existingIds.has(row.id)) continue;
    const total: number = row.chapter_count || 0;
    const allChapters: Chapter[] = [];
    let meta: any = null;
    const BATCH = 200;
    for (let offset = 0; ; offset += BATCH) {
      const r = await fetch(`${base}/api/novels/${row.id}/export?offset=${offset}&limit=${BATCH}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!meta) meta = j.data.novel;
      const chs = (j.data.chapters || []) as any[];
      for (const c of chs) {
        allChapters.push({
          id: c.id,
          chapterIndex: c.chapter_index,
          title: c.title,
          content: c.content || '',
          wordCount: c.word_count || 0
        });
      }
      onProgress({ novelTitle: meta.title, done: allChapters.length, total: total || allChapters.length });
      if (chs.length < BATCH) break;
    }
    const now = new Date().toISOString();
    let genres: string[] = [];
    try {
      const g = JSON.parse(meta.genres || '[]');
      if (Array.isArray(g)) genres = g;
    } catch {}
    const progress: ReadingProgress = {
      currentChapterIndex: 0,
      scrollPercentage: 0,
      lastReadAt: now,
      totalTimeSpentSeconds: 0
    };
    const novel: Novel = {
      id: meta.id,
      title: meta.title,
      author: meta.author || '',
      description: meta.description || '',
      coverUrl: meta.cover_url || '',
      genres,
      language: meta.language || 'vi',
      sourceFormat: 'json',
      chapters: allChapters,
      status: 'reading',
      progress,
      bookmarks: [],
      totalWords: meta.total_words || 0,
      createdAt: meta.created_at || now,
      updatedAt: now
    };
    await saveNovel(novel);
    pulled.push(novel);
  }
  return pulled;
}
