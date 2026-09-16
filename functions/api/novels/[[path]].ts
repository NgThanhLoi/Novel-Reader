// functions/api/novels/[[path]].ts
// Cloudflare Pages Functions - Full-stack Serverless Handler
// Bindings: env.DB (D1 Database), env.NOVEL_CACHE (Workers KV), env.NOVEL_BUCKET (R2 Bucket)

interface D1Result {
  results: any[];
}
interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(): Promise<T | null>;
  all<T = any>(): Promise<D1Result>;
  run(): Promise<any>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}
interface R2Bucket {
  get(key: string): Promise<any>;
  put(key: string, value: any): Promise<any>;
}

interface Env {
  DB: D1Database;
  NOVEL_CACHE: KVNamespace;
  NOVEL_BUCKET: R2Bucket;
}

interface PagesFunctionContext<E = Env> {
  request: Request;
  env: E;
  params: { path?: string | string[] };
}

export const onRequest = async (context: PagesFunctionContext<Env>): Promise<Response> => {
  const { request, env, params } = context;
  const pathParts = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  const path = pathParts.join('/');

  // CORS headers
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // 1. GET /api/novels -> Danh sách tất cả truyện
    if (request.method === 'GET' && (!path || path === '')) {
      const cacheKey = 'cache:novels:list';
      if (env.NOVEL_CACHE) {
        const cached = await env.NOVEL_CACHE.get(cacheKey);
        if (cached) {
          return new Response(cached, { headers });
        }
      }

      if (env.DB) {
        const query = `
          SELECT n.*, 
            p.current_chapter_index, p.scroll_percentage, p.last_read_at, p.time_spent_seconds,
            (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) as chapter_count
          FROM novels n
          LEFT JOIN reading_progress p ON n.id = p.novel_id
          ORDER BY datetime(COALESCE(p.last_read_at, n.updated_at)) DESC
        `;
        const { results } = await env.DB.prepare(query).all();
        const payload = JSON.stringify({ success: true, data: results });
        
        if (env.NOVEL_CACHE) {
          await env.NOVEL_CACHE.put(cacheKey, payload, { expirationTtl: 60 });
        }
        return new Response(payload, { headers });
      }

      return new Response(JSON.stringify({ success: true, data: [] }), { headers });
    }

    // 2. GET /api/novels/:id -> Chi tiết truyện & mục lục chương
    const novelDetailMatch = path.match(/^([a-zA-Z0-9_-]+)$/);
    if (request.method === 'GET' && novelDetailMatch) {
      const novelId = novelDetailMatch[1];
      if (env.DB) {
        const novel = await env.DB.prepare('SELECT * FROM novels WHERE id = ?').bind(novelId).first();
        if (!novel) {
          return new Response(JSON.stringify({ error: 'Không tìm thấy truyện' }), { status: 404, headers });
        }

        const { results: chapters } = await env.DB.prepare(
          'SELECT id, chapter_index, title, word_count FROM chapters WHERE novel_id = ? ORDER BY chapter_index ASC'
        ).bind(novelId).all();

        const progress = await env.DB.prepare('SELECT * FROM reading_progress WHERE novel_id = ?').bind(novelId).first();

        return new Response(JSON.stringify({ success: true, data: { ...novel, chapters, progress } }), { headers });
      }
      return new Response(JSON.stringify({ error: 'Database D1 chưa được cấu hình' }), { status: 500, headers });
    }

    // 2b. GET /api/novels/:id/export?offset&limit -> Bulk chương KÈM content (cho client sync)
    const exportMatch = path.match(/^([a-zA-Z0-9_-]+)\/export$/);
    if (request.method === 'GET' && exportMatch) {
      const novelId = exportMatch[1];
      const url = new URL(request.url);
      const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
      const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10) || 100));
      if (env.DB) {
        const novel = await env.DB.prepare('SELECT *, (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) as chapter_count FROM novels n WHERE id = ?').bind(novelId).first() as any;
        if (!novel) {
          return new Response(JSON.stringify({ error: 'Không tìm thấy truyện' }), { status: 404, headers });
        }
        const { results: chapters } = await env.DB.prepare(
          'SELECT id, chapter_index, title, content, word_count FROM chapters WHERE novel_id = ? ORDER BY chapter_index ASC LIMIT ? OFFSET ?'
        ).bind(novelId, limit, offset).all();
        return new Response(JSON.stringify({ success: true, data: { novel, chapters, offset, limit } }), { headers });
      }
      return new Response(JSON.stringify({ error: 'Database D1 chưa được cấu hình' }), { status: 500, headers });
    }

    // 3. GET /api/novels/:id/chapter/:idx -> Lấy nội dung chương (Edge Cached KV)
    const chapterMatch = path.match(/^([a-zA-Z0-9_-]+)\/chapter\/(\d+)$/);
    if (request.method === 'GET' && chapterMatch) {
      const [, novelId, chapterIdxStr] = chapterMatch;
      const chapterIdx = parseInt(chapterIdxStr, 10);
      const kvKey = `chapter:${novelId}:${chapterIdx}`;

      if (env.NOVEL_CACHE) {
        const cachedChapter = await env.NOVEL_CACHE.get(kvKey);
        if (cachedChapter) {
          return new Response(cachedChapter, { headers });
        }
      }

      if (env.DB) {
        const chapter = await env.DB.prepare(
          'SELECT * FROM chapters WHERE novel_id = ? AND chapter_index = ?'
        ).bind(novelId, chapterIdx).first();

        if (!chapter) {
          return new Response(JSON.stringify({ error: 'Không tìm thấy chương này' }), { status: 404, headers });
        }

        const respPayload = JSON.stringify({ success: true, data: chapter });
        if (env.NOVEL_CACHE) {
          await env.NOVEL_CACHE.put(kvKey, respPayload, { expirationTtl: 86400 * 7 });
        }
        return new Response(respPayload, { headers });
      }
    }

    // 4. POST /api/novels -> Lưu hoặc đồng bộ truyện và các chương vào D1 + KV
    if (request.method === 'POST' && (!path || path === '')) {
      const body = await request.json() as any;
      const { novel } = body;
      if (!novel || !novel.id) {
        return new Response(JSON.stringify({ error: 'Dữ liệu truyện không hợp lệ' }), { status: 400, headers });
      }

      if (env.DB) {
        await env.DB.prepare(`
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
        `).bind(
          novel.id, novel.title, novel.author, novel.description, novel.coverUrl || '',
          JSON.stringify(novel.genres || []), novel.language || 'vi', novel.sourceFormat,
          novel.status, novel.totalWords || 0, novel.createdAt, novel.updatedAt
        ).run();

        if (Array.isArray(novel.chapters) && novel.chapters.length > 0) {
          for (const ch of novel.chapters) {
            await env.DB.prepare(`
              INSERT OR REPLACE INTO chapters (id, novel_id, chapter_index, title, content, word_count)
              VALUES (?, ?, ?, ?, ?, ?)
            `).bind(ch.id, novel.id, ch.chapterIndex, ch.title, ch.content, ch.wordCount || 0).run();

            if (env.NOVEL_CACHE) {
              await env.NOVEL_CACHE.put(
                `chapter:${novel.id}:${ch.chapterIndex}`,
                JSON.stringify({ success: true, data: ch }),
                { expirationTtl: 86400 * 7 }
              );
            }
          }
        }

        if (env.NOVEL_CACHE) {
          await env.NOVEL_CACHE.delete('cache:novels:list');
        }

        return new Response(JSON.stringify({ success: true, message: 'Đã lưu vào Cloudflare D1 & KV' }), { headers });
      }

      return new Response(JSON.stringify({ error: 'Database D1 chưa được cấu hình' }), { status: 500, headers });
    }

    // 5. POST /api/novels/progress -> Lưu vị trí đọc
    if (request.method === 'POST' && path === 'progress') {
      const { novelId, currentChapterIndex, scrollPercentage, timeSpentSeconds } = await request.json() as any;
      const now = new Date().toISOString();

      if (env.DB) {
        await env.DB.prepare(`
          INSERT INTO reading_progress (novel_id, current_chapter_index, scroll_percentage, last_read_at, time_spent_seconds)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(novel_id) DO UPDATE SET
            current_chapter_index = excluded.current_chapter_index,
            scroll_percentage = excluded.scroll_percentage,
            last_read_at = excluded.last_read_at,
            time_spent_seconds = time_spent_seconds + excluded.time_spent_seconds
        `).bind(novelId, currentChapterIndex, scrollPercentage, now, timeSpentSeconds || 0).run();

        if (env.NOVEL_CACHE) {
          await env.NOVEL_CACHE.delete('cache:novels:list');
        }
        return new Response(JSON.stringify({ success: true, updatedAt: now }), { headers });
      }
    }

    return new Response(JSON.stringify({ error: 'Endpoint không tồn tại' }), { status: 404, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};
