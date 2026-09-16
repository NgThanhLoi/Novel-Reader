-- ==========================================================
-- Cloudflare D1 SQL Schema for Novel Reader & Library
-- Khởi tạo bảng:
-- npx wrangler d1 execute novel-library-d1 --file=schema.sql --remote
-- ==========================================================

-- 1. Bảng Novels (Thông tin sách)
CREATE TABLE IF NOT EXISTS novels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT DEFAULT 'Khuyết danh',
  description TEXT,
  cover_url TEXT,
  genres TEXT, -- JSON array of strings: '["Tiên Hiệp", "Huyền Huyễn"]'
  language TEXT DEFAULT 'vi',
  source_format TEXT NOT NULL, -- 'json' | 'epub' | 'mobi' | 'txt'
  status TEXT DEFAULT 'reading', -- 'reading' | 'completed' | 'favorite' | 'plan_to_read'
  total_words INTEGER DEFAULT 0,
  rating REAL DEFAULT 5,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Bảng Chapters (Nội dung từng chương, có đánh index thứ tự)
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

-- 3. Bảng Reading Progress (Tiến độ đọc)
CREATE TABLE IF NOT EXISTS reading_progress (
  novel_id TEXT PRIMARY KEY,
  current_chapter_index INTEGER DEFAULT 0,
  scroll_percentage REAL DEFAULT 0,
  last_read_at TEXT NOT NULL,
  time_spent_seconds INTEGER DEFAULT 0,
  FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
);

-- 4. Bảng Bookmarks (Đánh dấu trang)
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
