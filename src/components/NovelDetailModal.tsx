import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  FileDown, 
  Trash2, 
  Calendar, 
  User, 
  Layers, 
  FileText, 
  Star, 
  BookmarkCheck, 
  Clock, 
  CheckCircle2, 
  ArrowRight
} from 'lucide-react';
import { Novel, NovelStatus } from '../types';

interface NovelDetailModalProps {
  novel: Novel | null;
  isOpen: boolean;
  onClose: () => void;
  onReadChapter: (novel: Novel, chapterIndex: number) => void;
  onUpdateStatus: (novelId: string, status: NovelStatus) => void;
  onDelete: (novelId: string) => void;
  isDark: boolean;
}

export const NovelDetailModal: React.FC<NovelDetailModalProps> = ({
  novel,
  isOpen,
  onClose,
  onReadChapter,
  onUpdateStatus,
  onDelete,
  isDark
}) => {
  const [chapterSearch, setChapterSearch] = useState('');

  if (!isOpen || !novel) return null;

  const currentCh = novel.progress.currentChapterIndex;
  const filteredChapters = novel.chapters.filter(ch => 
    ch.title.toLowerCase().includes(chapterSearch.toLowerCase()) || 
    (ch.chapterIndex + 1).toString().includes(chapterSearch)
  );

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(novel, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `${novel.title.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const statusOptions: { value: NovelStatus; label: string }[] = [
    { value: 'reading', label: 'Đang đọc' },
    { value: 'favorite', label: 'Yêu thích' },
    { value: 'completed', label: 'Đã hoàn thành' },
    { value: 'plan_to_read', label: 'Dự định đọc' },
    { value: 'dropped', label: 'Tạm ngưng' }
  ];

  return (
    <div 
      id="novel-detail-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <div 
        id="novel-detail-modal-container"
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden transition-all my-8 ${
          isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-inherit">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full uppercase font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              {novel.sourceFormat}
            </span>
            <h2 className="text-base font-bold truncate max-w-md">{novel.title}</h2>
          </div>
          <button
            id="close-novel-detail-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Top Info Grid */}
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Book Cover */}
            <div className="w-full sm:w-44 h-60 shrink-0 rounded-xl overflow-hidden shadow-md border border-inherit bg-neutral-800 relative">
              {novel.coverUrl ? (
                <img 
                  src={novel.coverUrl} 
                  alt={novel.title} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-800 to-neutral-950 p-4 flex flex-col justify-between text-white">
                  <span className="text-[10px] tracking-wider uppercase text-amber-300">
                    {novel.genres[0] || 'Tác phẩm'}
                  </span>
                  <div>
                    <p className="font-serif font-bold text-sm line-clamp-3 leading-snug">{novel.title}</p>
                    <p className="text-xs text-white/70 mt-1">{novel.author}</p>
                  </div>
                  <span className="text-[10px] text-white/50">{novel.chapters.length} chương</span>
                </div>
              )}
            </div>

            {/* Book Details */}
            <div className="flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-xl font-bold font-serif mb-1">{novel.title}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-3">
                  <User className="w-3.5 h-3.5" />
                  <span>{novel.author || 'Khuyết danh'}</span>
                </p>

                {/* Genre Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {novel.genres.map((g, idx) => (
                    <span 
                      key={idx}
                      className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium"
                    >
                      {g}
                    </span>
                  ))}
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50 text-xs">
                  <div>
                    <span className="block text-neutral-400 text-[10px] uppercase">Tổng số chương</span>
                    <span className="font-bold">{novel.chapters.length}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 text-[10px] uppercase">Ước tính từ</span>
                    <span className="font-bold">~{novel.totalWords.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 text-[10px] uppercase">Tiến độ hiện tại</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      Chương {currentCh + 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-neutral-500 font-medium shrink-0">Trạng thái:</label>
                  <select
                    value={novel.status}
                    onChange={(e) => onUpdateStatus(novel.id, e.target.value as NovelStatus)}
                    className={`text-xs px-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                      isDark ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
                    }`}
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    id="read-current-chapter-btn"
                    onClick={() => onReadChapter(novel, currentCh)}
                    className="flex-1 min-w-[140px] py-2 px-4 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Đọc tiếp Chương {currentCh + 1}</span>
                  </button>

                  <button
                    id="export-novel-json-btn"
                    onClick={handleExportJson}
                    className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'
                    }`}
                    title="Sao lưu tác phẩm dạng JSON (hỗ trợ import vào Cloudflare D1)"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Xuất JSON</span>
                  </button>

                  <button
                    id="delete-novel-detail-btn"
                    onClick={() => {
                      if (window.confirm(`Xóa vĩnh viễn "${novel.title}" khỏi thư viện?`)) {
                        onDelete(novel.id);
                        onClose();
                      }
                    }}
                    className="p-2 rounded-lg border border-rose-500/20 text-rose-600 hover:bg-rose-500/10 transition-colors"
                    title="Xóa truyện"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {novel.description && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Tóm tắt nội dung</h4>
              <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300 whitespace-pre-line bg-neutral-50 dark:bg-neutral-800/30 p-3.5 rounded-xl border border-inherit">
                {novel.description}
              </p>
            </div>
          )}

          {/* Table of Contents */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Mục lục các chương ({novel.chapters.length})
              </h4>
              <input
                type="text"
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                placeholder="Tìm chương..."
                className={`text-xs px-2.5 py-1 rounded-lg border w-40 focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-100 border-neutral-200'
                }`}
              />
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-inherit divide-y divide-inherit">
              {filteredChapters.map((ch) => {
                const isCurrent = ch.chapterIndex === currentCh;
                return (
                  <button
                    key={ch.id}
                    onClick={() => onReadChapter(novel, ch.chapterIndex)}
                    className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold'
                        : isDark
                          ? 'hover:bg-neutral-800 text-neutral-200'
                          : 'hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {isCurrent && <BookmarkCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      <span className="truncate">{ch.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-neutral-400 shrink-0">
                      <span>{ch.wordCount.toLocaleString()} từ</span>
                      <ArrowRight className="w-3 h-3 text-neutral-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
