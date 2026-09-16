import React from 'react';
import { BookOpen, Star, MoreVertical, Trash2, Clock, CheckCircle2, Bookmark } from 'lucide-react';
import { Novel } from '../types';

interface BookCardProps {
  novel: Novel;
  onRead: (novel: Novel, chapterIndex?: number) => void;
  onSelectDetail: (novel: Novel) => void;
  onToggleFavorite: (novel: Novel) => void;
  onDelete: (id: string) => void;
  isDark: boolean;
}

// Generate pleasing pastel / dark gradient based on novel title
function getCoverGradient(title: string): string {
  const gradients = [
    'from-amber-700 to-orange-900',
    'from-emerald-800 to-teal-950',
    'from-blue-800 to-indigo-950',
    'from-purple-800 to-violet-950',
    'from-rose-800 to-red-950',
    'from-stone-800 to-neutral-950'
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export const BookCard: React.FC<BookCardProps> = ({
  novel,
  onRead,
  onSelectDetail,
  onToggleFavorite,
  onDelete,
  isDark
}) => {
  const totalChapters = novel.chapters.length || 1;
  const currentCh = Math.min(novel.progress.currentChapterIndex + 1, totalChapters);
  const percent = Math.min(100, Math.round(((novel.progress.currentChapterIndex + (novel.progress.scrollPercentage / 100)) / totalChapters) * 100));
  const isFavorite = novel.status === 'favorite';

  const formatColorMap: Record<string, string> = {
    epub: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    mobi: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    json: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    txt: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    manual: 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-500/30'
  };

  return (
    <div 
      id={`book-card-${novel.id}`}
      className={`group relative flex flex-col rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${
        isDark 
          ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700' 
          : 'bg-white border-neutral-200/90 hover:border-neutral-300 shadow-sm'
      }`}
    >
      {/* Top Cover Visual */}
      <div 
        onClick={() => onRead(novel)}
        className="relative h-48 w-full cursor-pointer overflow-hidden select-none bg-neutral-900"
      >
        {novel.coverUrl ? (
          <img 
            src={novel.coverUrl} 
            alt={novel.title} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(novel.title)} p-6 flex flex-col justify-between text-white relative`}>
            {/* Book spine line styling */}
            <div className="absolute left-3 top-0 bottom-0 w-1 bg-white/20 blur-[0.5px]"></div>
            
            <div className="flex justify-between items-start pl-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300/80">
                {novel.genres[0] || 'Tác phẩm'}
              </span>
              <span className="text-white/40 text-xs">●●●</span>
            </div>

            <div className="pl-2">
              <h3 className="font-serif font-bold text-lg leading-tight line-clamp-3 mb-1.5 text-white/95 drop-shadow">
                {novel.title}
              </h3>
              <p className="text-xs text-white/70 italic line-clamp-1">
                {novel.author}
              </p>
            </div>

            <div className="pl-2 flex items-center justify-between text-[11px] text-white/60">
              <span>{novel.chapters.length} chương</span>
              <span>~{Math.round(novel.totalWords / 1000)}k từ</span>
            </div>
          </div>
        )}

        {/* Format Badge Overlay */}
        <div className="absolute top-3 left-3 z-10">
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border backdrop-blur-md ${formatColorMap[novel.sourceFormat] || formatColorMap.epub}`}>
            {novel.sourceFormat}
          </span>
        </div>

        {/* Favorite Quick Toggle */}
        <button
          id={`favorite-btn-${novel.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(novel);
          }}
          className={`absolute top-3 right-3 z-10 p-1.5 rounded-full backdrop-blur-md transition-all ${
            isFavorite 
              ? 'bg-amber-500 text-white shadow-md' 
              : 'bg-black/40 text-white/70 hover:text-white hover:bg-black/60'
          }`}
          title={isFavorite ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích'}
        >
          <Star className="w-3.5 h-3.5 fill-current" />
        </button>

        {/* Reading progress overlay at bottom of cover */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-black/40">
          <div 
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Book Meta Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Title & Author */}
          <div className="mb-2">
            <h4 
              onClick={() => onRead(novel)}
              className="font-bold text-sm line-clamp-1 cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              title={novel.title}
            >
              {novel.title}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {novel.author || 'Khuyết danh'}
            </p>
          </div>

          {/* Genre Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {novel.genres.slice(0, 2).map((g, idx) => (
              <span 
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
              >
                {g}
              </span>
            ))}
            {novel.genres.length > 2 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md text-neutral-400">
                +{novel.genres.length - 2}
              </span>
            )}
          </div>

          {/* Description snippet */}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-3">
            {novel.description || 'Chưa có mô tả chi tiết cho tác phẩm này.'}
          </p>
        </div>

        {/* Bottom Progress Details & Action */}
        <div className="pt-2 border-t border-inherit">
          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mb-2.5">
            <span className="font-medium">
              Chương {currentCh}/{totalChapters}
            </span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {percent}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id={`read-now-btn-${novel.id}`}
              onClick={() => onRead(novel)}
              className="flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-amber-600 dark:hover:bg-amber-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{percent > 0 ? 'Đọc tiếp' : 'Bắt đầu đọc'}</span>
            </button>

            <button
              id={`detail-novel-btn-${novel.id}`}
              onClick={() => onSelectDetail(novel)}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
              title="Xem thông tin chi tiết & mục lục"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>

            <button
              id={`delete-novel-btn-${novel.id}`}
              onClick={() => {
                if (window.confirm(`Bạn có chắc chắn muốn xóa "${novel.title}" khỏi thư viện?`)) {
                  onDelete(novel.id);
                }
              }}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-neutral-400 transition-colors"
              title="Xóa khỏi thư viện"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
