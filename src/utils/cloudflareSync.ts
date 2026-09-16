import { Novel, CloudflareConfig } from '../types';

export const CLOUDFLARE_D1_SCHEMA = `-- ==========================================================
-- Cloudflare D1 SQL Schema for Novel Reader & Library
-- Execute via wrangler:
-- wrangler d1 execute <DATABASE_NAME> --file=schema.sql
-- ==========================================================

-- 1. Table Novels
CREATE TABLE IF NOT EXISTS novels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT DEFAULT 'Khuyết danh',
  description TEXT,
  cover_url TEXT,
  genres TEXT, -- JSON array of strings
  language TEXT DEFAULT 'vi',
  source_format TEXT NOT NULL, -- 'json' | 'epub' | 'mobi' | 'txt'
  status TEXT DEFAULT 'reading', -- 'reading' | 'completed' | 'favorite' | 'plan_to_read'
  total_words INTEGER DEFAULT 0,
  rating REAL DEFAULT 5,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Table Chapters (Indexed for instant chapter fetching)
CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL,
  chapter_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chapters_novel_order 
ON chapters (novel_id, chapter_index ASC);

-- 3. Table Reading Progress
CREATE TABLE IF NOT EXISTS reading_progress (
  novel_id TEXT PRIMARY KEY,
  current_chapter_index INTEGER DEFAULT 0,
  scroll_percentage REAL DEFAULT 0,
  last_read_at TEXT NOT NULL,
  time_spent_seconds INTEGER DEFAULT 0,
  FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
);

-- 4. Table Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL,
  chapter_index INTEGER NOT NULL,
  chapter_title TEXT,
  percentage REAL DEFAULT 0,
  text_snippet TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
);
`;

export const WRANGLER_TOML_TEMPLATE = `# wrangler.toml
# Cloudflare Pages / Workers Full-stack Configuration
name = "novel-reader-app"
compatibility_date = "2024-09-01"
pages_build_output_dir = "dist"

# 1. Cloudflare D1 Database Binding
[[d1_databases]]
binding = "DB"
database_name = "novel-library-d1"
database_id = "your-d1-database-uuid-here"

# 2. Cloudflare Workers KV (Fast cache for metadata and reading positions)
[[kv_namespaces]]
binding = "NOVEL_CACHE"
id = "your-kv-namespace-id-here"

# 3. Cloudflare R2 Storage (For raw .epub, .mobi files & high-res book covers)
[[r2_buckets]]
binding = "NOVEL_BUCKET"
bucket_name = "novel-storage-r2"
`;

export const CLOUDFLARE_PAGES_FUNCTION_CODE = `// functions/api/novels/[[path]].ts
// Cloudflare Pages Functions - Full-stack Serverless Handler
// Bindings: env.DB (D1), env.NOVEL_CACHE (KV), env.NOVEL_BUCKET (R2)

interface Env {
  DB: D1Database;
  NOVEL_CACHE: KVNamespace;
  NOVEL_BUCKET: R2Bucket;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = (params.path as string[] || []).join('/');

  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // GET /api/novels -> List all novels (with KV cache)
    if (request.method === 'GET' && (!path || path === '')) {
      const cacheKey = 'cache:novels:list';
      const cached = await env.NOVEL_CACHE.get(cacheKey);
      if (cached) {
        return new Response(cached, { headers });
      }

      const query = \`
        SELECT n.*, 
          p.current_chapter_index, p.scroll_percentage, p.last_read_at, p.time_spent_seconds,
          (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) as chapter_count
        FROM novels n
        LEFT JOIN reading_progress p ON n.id = p.novel_id
        ORDER BY datetime(COALESCE(p.last_read_at, n.updated_at)) DESC
      \`;
      const { results } = await env.DB.prepare(query).all();
      
      const payload = JSON.stringify({ success: true, data: results });
      // Cache for 60 seconds
      await env.NOVEL_CACHE.put(cacheKey, payload, { expirationTtl: 60 });
      return new Response(payload, { headers });
    }

    // GET /api/novels/:id -> Get single novel with chapter list
    const novelDetailMatch = path.match(/^([a-zA-Z0-9_-]+)$/);
    if (request.method === 'GET' && novelDetailMatch) {
      const novelId = novelDetailMatch[1];
      const novel = await env.DB.prepare('SELECT * FROM novels WHERE id = ?').bind(novelId).first();
      if (!novel) {
        return new Response(JSON.stringify({ error: 'Novel not found' }), { status: 404, headers });
      }

      const { results: chapters } = await env.DB.prepare(
        'SELECT id, chapter_index, title, word_count FROM chapters WHERE novel_id = ? ORDER BY chapter_index ASC'
      ).bind(novelId).all();

      const progress = await env.DB.prepare('SELECT * FROM reading_progress WHERE novel_id = ?').bind(novelId).first();

      return new Response(JSON.stringify({ success: true, data: { ...novel, chapters, progress } }), { headers });
    }

    // GET /api/novels/:id/chapter/:idx -> Fetch chapter content (Cached in KV)
    const chapterMatch = path.match(/^([a-zA-Z0-9_-]+)\\/chapter\\/(\\d+)$/);
    if (request.method === 'GET' && chapterMatch) {
      const [, novelId, chapterIdxStr] = chapterMatch;
      const chapterIdx = parseInt(chapterIdxStr, 10);
      const kvKey = \`chapter:\${novelId}:\${chapterIdx}\`;

      const cachedChapter = await env.NOVEL_CACHE.get(kvKey);
      if (cachedChapter) {
        return new Response(cachedChapter, { headers });
      }

      const chapter = await env.DB.prepare(
        'SELECT * FROM chapters WHERE novel_id = ? AND chapter_index = ?'
      ).bind(novelId, chapterIdx).first();

      if (!chapter) {
        return new Response(JSON.stringify({ error: 'Chapter not found' }), { status: 404, headers });
      }

      const respPayload = JSON.stringify({ success: true, data: chapter });
      await env.NOVEL_CACHE.put(kvKey, respPayload, { expirationTtl: 86400 * 7 }); // 7 days cache
      return new Response(respPayload, { headers });
    }

    // POST /api/novels -> Create or sync novel
    if (request.method === 'POST' && (!path || path === '')) {
      const body = await request.json() as any;
      const { novel } = body;
      if (!novel || !novel.id) {
        return new Response(JSON.stringify({ error: 'Invalid novel payload' }), { status: 400, headers });
      }

      // Upsert into D1
      await env.DB.prepare(\`
        INSERT INTO novels (id, title, author, description, cover_url, genres, language, source_format, status, total_words, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          author = excluded.author,
          description = excluded.description,
          cover_url = excluded.cover_url,
          genres = excluded.genres,
          status = excluded.status,
          total_words = excluded.total_words,
          updated_at = excluded.updated_at
      \`).bind(
        novel.id, novel.title, novel.author, novel.description, novel.coverUrl || '',
        JSON.stringify(novel.genres || []), novel.language || 'vi', novel.sourceFormat,
        novel.status, novel.totalWords || 0, novel.createdAt, novel.updatedAt
      ).run();

      // Batch insert chapters
      if (Array.isArray(novel.chapters) && novel.chapters.length > 0) {
        for (const ch of novel.chapters) {
          await env.DB.prepare(\`
            INSERT OR REPLACE INTO chapters (id, novel_id, chapter_index, title, content, word_count)
            VALUES (?, ?, ?, ?, ?, ?)
          \`).bind(ch.id, novel.id, ch.chapterIndex, ch.title, ch.content, ch.wordCount || 0).run();

          // Warm KV cache for fast edge delivery
          await env.NOVEL_CACHE.put(
            \`chapter:\${novel.id}:\${ch.chapterIndex}\`,
            JSON.stringify({ success: true, data: ch }),
            { expirationTtl: 86400 * 7 }
          );
        }
      }

      // Invalidate list cache
      await env.NOVEL_CACHE.delete('cache:novels:list');

      return new Response(JSON.stringify({ success: true, message: 'Saved to D1 & KV' }), { headers });
    }

    // POST /api/progress -> Update reading position (Instant D1 & KV sync)
    if (request.method === 'POST' && path === 'progress') {
      const { novelId, currentChapterIndex, scrollPercentage, timeSpentSeconds } = await request.json() as any;
      const now = new Date().toISOString();

      await env.DB.prepare(\`
        INSERT INTO reading_progress (novel_id, current_chapter_index, scroll_percentage, last_read_at, time_spent_seconds)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(novel_id) DO UPDATE SET
          current_chapter_index = excluded.current_chapter_index,
          scroll_percentage = excluded.scroll_percentage,
          last_read_at = excluded.last_read_at,
          time_spent_seconds = time_spent_seconds + excluded.time_spent_seconds
      \`).bind(novelId, currentChapterIndex, scrollPercentage, now, timeSpentSeconds || 0).run();

      await env.NOVEL_CACHE.delete('cache:novels:list');
      return new Response(JSON.stringify({ success: true, updatedAt: now }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), { status: 404, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};
`;

// Helper to test connection to remote Cloudflare endpoint
export async function testCloudflareConnection(endpoint: string, apiKey?: string): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = endpoint.trim().replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/api/novels`, {
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      }
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, message: `Kết nối thành công! Cloudflare Pages Functions phản hồi tốt (${res.status}).` };
    } else {
      return { success: false, message: `Máy chủ phản hồi mã lỗi: ${res.status} ${res.statusText}` };
    }
  } catch (err: any) {
    return { success: false, message: `Không thể kết nối đến ${endpoint}: ${err.message}` };
  }
}

// Helper to push novel to remote Cloudflare endpoint
export async function syncNovelToCloudflare(endpoint: string, novel: Novel, apiKey?: string): Promise<boolean> {
  try {
    const cleanUrl = endpoint.trim().replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/api/novels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({ novel })
    });
    return res.ok;
  } catch (e) {
    console.error('Failed to sync novel to Cloudflare', e);
    return false;
  }
}
