import React from 'react';
import { 
  X, 
  BarChart3, 
  BookOpen, 
  Clock, 
  Layers, 
  Flame, 
  Star, 
  Download,
  CheckCircle2
} from 'lucide-react';
import { Novel } from '../types';
import { exportLibraryJson } from '../utils/storage';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  novels: Novel[];
  isDark: boolean;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  novels,
  isDark
}) => {
  if (!isOpen) return null;

  const totalNovels = novels.length;
  const completedNovels = novels.filter(n => n.status === 'completed').length;
  const favoriteNovels = novels.filter(n => n.status === 'favorite').length;
  const readingNovels = novels.filter(n => n.status === 'reading').length;

  const totalChapters = novels.reduce((acc, n) => acc + n.chapters.length, 0);
  const totalWords = novels.reduce((acc, n) => acc + n.totalWords, 0);
  const totalTimeSeconds = novels.reduce((acc, n) => acc + (n.progress.totalTimeSpentSeconds || 0), 0);
  const totalHours = (totalTimeSeconds / 3600).toFixed(1);

  // Genre distribution
  const genreCount: Record<string, number> = {};
  novels.forEach(n => {
    n.genres.forEach(g => {
      genreCount[g] = (genreCount[g] || 0) + 1;
    });
  });

  const sortedGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div 
      id="stats-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <div 
        id="stats-modal-container"
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden transition-all my-8 ${
          isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Thống Kê Thư Viện Cá Nhân</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Theo dõi tiến độ, thói quen đọc và quản lý dữ liệu
              </p>
            </div>
          </div>
          <button
            id="close-stats-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-inherit bg-neutral-50 dark:bg-neutral-800/40">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Tổng sách</span>
                <BookOpen className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold">{totalNovels}</p>
              <span className="text-[10px] text-neutral-500">Trong thư viện</span>
            </div>

            <div className="p-4 rounded-xl border border-inherit bg-neutral-50 dark:bg-neutral-800/40">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Số chương</span>
                <Layers className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold">{totalChapters}</p>
              <span className="text-[10px] text-neutral-500">Tổng các đầu sách</span>
            </div>

            <div className="p-4 rounded-xl border border-inherit bg-neutral-50 dark:bg-neutral-800/40">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Tổng số từ</span>
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-2xl font-bold">{Math.round(totalWords / 1000)}k</p>
              <span className="text-[10px] text-neutral-500">~{totalWords.toLocaleString()} chữ</span>
            </div>

            <div className="p-4 rounded-xl border border-inherit bg-neutral-50 dark:bg-neutral-800/40">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-[11px] font-semibold uppercase">Thời gian</span>
                <Clock className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold">{totalHours}h</p>
              <span className="text-[10px] text-neutral-500">Đã đọc trên app</span>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="p-4 rounded-xl border border-inherit space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Tình trạng thư viện
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <span className="block font-bold text-lg">{readingNovels}</span>
                <span className="text-[11px]">Đang đọc</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <span className="block font-bold text-lg">{completedNovels}</span>
                <span className="text-[11px]">Đã hoàn thành</span>
              </div>
              <div className="p-3 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300">
                <span className="block font-bold text-lg">{favoriteNovels}</span>
                <span className="text-[11px]">Yêu thích</span>
              </div>
            </div>
          </div>

          {/* Genre Preferences */}
          {sortedGenres.length > 0 && (
            <div className="p-4 rounded-xl border border-inherit space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Thể loại ưa thích
              </h4>
              <div className="space-y-2">
                {sortedGenres.map(([genre, count]) => {
                  const pct = Math.round((count / totalNovels) * 100);
                  return (
                    <div key={genre} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span>{genre}</span>
                        <span className="text-neutral-400">{count} truyện ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Data Backup & Migration */}
          <div className="p-4 rounded-xl border border-inherit flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-50 dark:bg-neutral-800/30">
            <div>
              <h4 className="text-xs font-bold mb-1">Sao lưu toàn bộ thư viện</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Xuất tệp JSON chứa tất cả truyện, chương và tiến độ đọc để lưu trữ hoặc nhập vào Cloudflare D1.
              </p>
            </div>
            <button
              id="export-library-backup-btn"
              onClick={() => exportLibraryJson(novels)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-900 shrink-0 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải bản sao lưu JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
