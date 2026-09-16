import React, { useState } from 'react';
import { 
  BookOpen, 
  UploadCloud, 
  Filter, 
  ArrowUpDown, 
  Star, 
  Sparkles, 
  Library, 
  Compass,
  CheckCircle2
} from 'lucide-react';
import { Novel, NovelStatus, NovelFormat } from '../types';
import { BookCard } from './BookCard';

interface LibraryViewProps {
  novels: Novel[];
  searchQuery: string;
  onReadNovel: (novel: Novel, chapterIndex?: number) => void;
  onSelectDetail: (novel: Novel) => void;
  onToggleFavorite: (novel: Novel) => void;
  onDeleteNovel: (id: string) => void;
  onOpenUpload: () => void;
  isDark: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  novels,
  searchQuery,
  onReadNovel,
  onSelectDetail,
  onToggleFavorite,
  onDeleteNovel,
  onOpenUpload,
  isDark
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | NovelStatus>('all');
  const [formatFilter, setFormatFilter] = useState<'all' | NovelFormat>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress' | 'chapters'>('recent');

  // Filter novels
  const filteredNovels = novels.filter(novel => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = novel.title.toLowerCase().includes(q);
      const matchAuthor = novel.author.toLowerCase().includes(q);
      const matchGenres = novel.genres.some(g => g.toLowerCase().includes(q));
      if (!matchTitle && !matchAuthor && !matchGenres) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'favorite') {
        if (novel.status !== 'favorite') return false;
      } else {
        if (novel.status !== statusFilter) return false;
      }
    }

    // Format filter
    if (formatFilter !== 'all') {
      if (novel.sourceFormat !== formatFilter) return false;
    }

    return true;
  });

  // Sort novels
  const sortedNovels = [...filteredNovels].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.progress.lastReadAt || b.updatedAt).getTime() - 
             new Date(a.progress.lastReadAt || a.updatedAt).getTime();
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title, 'vi');
    }
    if (sortBy === 'progress') {
      const aPct = (a.progress.currentChapterIndex + (a.progress.scrollPercentage / 100)) / (a.chapters.length || 1);
      const bPct = (b.progress.currentChapterIndex + (b.progress.scrollPercentage / 100)) / (b.chapters.length || 1);
      return bPct - aPct;
    }
    if (sortBy === 'chapters') {
      return b.chapters.length - a.chapters.length;
    }
    return 0;
  });

  return (
    <div id="library-view-root" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner / Welcome Minimalist Bar */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800/80 border-neutral-800 text-neutral-100' 
          : 'bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 border-amber-200/60 text-neutral-900 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Thư Viện Cá Nhân
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {novels.length} tác phẩm
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-serif">
              Không gian đọc sách tối giản
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Tải lên và đọc sách định dạng <strong>EPUB</strong>, <strong>MOBI</strong>, <strong>JSON</strong> và <strong>TXT</strong> với trình đọc tùy biến cao, chế độ đọc đêm và đồng bộ Cloudflare Serverless D1/KV.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="banner-upload-btn"
              onClick={onOpenUpload}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Thêm truyện mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-inherit">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'reading', label: 'Đang đọc' },
            { id: 'favorite', label: 'Yêu thích' },
            { id: 'completed', label: 'Đã xong' },
            { id: 'plan_to_read', label: 'Dự định đọc' }
          ].map(tab => (
            <button
              key={tab.id}
              id={`filter-status-${tab.id}`}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : isDark 
                    ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800' 
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Sort & Format Filters */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Format selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400 text-[11px] hidden sm:inline">Định dạng:</span>
            <select
              id="format-filter-select"
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value as any)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-200' : 'bg-white border-neutral-200 text-neutral-800'
              }`}
            >
              <option value="all">Tất cả định dạng</option>
              <option value="epub">EPUB</option>
              <option value="mobi">MOBI</option>
              <option value="json">JSON</option>
              <option value="txt">TXT</option>
            </select>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
            <select
              id="sort-novels-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-200' : 'bg-white border-neutral-200 text-neutral-800'
              }`}
            >
              <option value="recent">Đọc gần đây nhất</option>
              <option value="title">Tên sách (A-Z)</option>
              <option value="progress">Tiến độ cao nhất</option>
              <option value="chapters">Nhiều chương nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Book Cards Grid */}
      {sortedNovels.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sortedNovels.map(novel => (
            <BookCard
              key={novel.id}
              novel={novel}
              onRead={onReadNovel}
              onSelectDetail={onSelectDetail}
              onToggleFavorite={onToggleFavorite}
              onDelete={onDeleteNovel}
              isDark={isDark}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className={`p-12 text-center rounded-3xl border ${
          isDark ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-white'
        }`}>
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Compass className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold mb-1">Không tìm thấy tác phẩm nào</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto mb-6">
            {searchQuery 
              ? `Không có kết quả nào khớp với "${searchQuery}". Vui lòng thử từ khóa khác.`
              : 'Thư viện hiện chưa có tác phẩm nào phù hợp với bộ lọc hiện tại.'}
          </p>
          <button
            id="empty-state-upload-btn"
            onClick={onOpenUpload}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Tải truyện lên ngay (.epub, .mobi, .json)</span>
          </button>
        </div>
      )}
    </div>
  );
};
