import React, { useState } from 'react';
import { 
  BookOpen, 
  UploadCloud, 
  Moon, 
  Sun, 
  Cloud, 
  BarChart3, 
  Search, 
  Sparkles,
  BookMarked,
  X
} from 'lucide-react';
import { ReaderTheme } from '../types';

interface NavbarProps {
  currentView: 'library' | 'reader' | 'stats';
  onNavigate: (view: 'library' | 'reader' | 'stats') => void;
  hasActiveNovel: boolean;
  activeNovelTitle?: string;
  onOpenUpload: () => void;
  onOpenCloudflare: () => void;
  onOpenStats: () => void;
  theme: ReaderTheme;
  onToggleNightMode: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  hasActiveNovel,
  activeNovelTitle,
  onOpenUpload,
  onOpenCloudflare,
  onOpenStats,
  theme,
  onToggleNightMode,
  searchQuery,
  onSearchChange
}) => {
  const isDark = theme === 'dark' || theme === 'oled' || theme === 'nord';

  return (
    <header 
      id="app-header"
      className={`sticky top-0 z-40 border-b transition-colors duration-200 ${
        isDark 
          ? 'bg-neutral-900/95 border-neutral-800 text-neutral-100 backdrop-blur-md' 
          : 'bg-white/95 border-neutral-200/80 text-neutral-900 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            id="nav-logo-btn"
            onClick={() => onNavigate('library')}
            className="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block leading-tight">
                Thư Viện Sách
              </span>
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hidden min-[420px]:block tracking-wider uppercase">
                Cloudflare Serverless
              </span>
            </div>
          </button>
        </div>

        {/* Center: Search & Navigation tabs */}
        <div className="hidden md:flex items-center gap-4 flex-1 max-w-xl mx-2">
          {/* Search Input */}
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              id="library-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm theo tên truyện, tác giả, thể loại..."
              className={`w-full pl-9 pr-8 py-1.5 text-sm rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                isDark
                  ? 'bg-neutral-800/80 border-neutral-700 text-neutral-200 placeholder-neutral-500 focus:border-amber-500'
                  : 'bg-neutral-100/80 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-amber-500'
              }`}
            />
            {searchQuery && (
              <button
                id="search-clear-btn"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Reader Quick Jump */}
          {hasActiveNovel && (
            <button
              id="nav-active-reader-btn"
              onClick={() => onNavigate('reader')}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                currentView === 'reader'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                  : isDark 
                    ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                    : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
              }`}
              title={activeNovelTitle ? `Đang đọc: ${activeNovelTitle}` : 'Đọc tiếp'}
            >
              <BookMarked className="w-3.5 h-3.5 text-amber-500" />
              <span className="max-w-[120px] truncate">{activeNovelTitle || 'Đọc tiếp'}</span>
            </button>
          )}

          {/* Stats Button */}
          <button
            id="nav-stats-btn"
            onClick={onOpenStats}
            title="Thống kê đọc sách"
            className={`p-2 rounded-lg transition-colors border hidden sm:block ${
              isDark 
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300' 
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Cloudflare Serverless Architecture Button */}
          <button
            id="nav-cloudflare-btn"
            onClick={onOpenCloudflare}
            title="Kiến trúc Cloudflare Serverless (D1 + KV + R2)"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isDark
                ? 'bg-amber-950/30 border-amber-800/60 text-amber-300 hover:bg-amber-900/40'
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/80'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden lg:inline">Cloudflare</span>
          </button>

          {/* Day / Night Mode Toggle */}
          <button
            id="nav-theme-toggle-btn"
            onClick={onToggleNightMode}
            title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ đọc đêm'}
            className={`p-2 rounded-lg transition-colors border ${
              isDark 
                ? 'border-neutral-800 bg-neutral-800/80 text-amber-400 hover:bg-neutral-800' 
                : 'border-neutral-200 bg-neutral-100/80 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Upload Button */}
          <button
            id="nav-upload-novel-btn"
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-transform active:scale-95 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Thêm truyện</span>
          </button>
        </div>
      </div>

      {/* Mobile Search Row */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            id="mobile-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm truyện, tác giả..."
            className={`w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
              isDark
                ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
                : 'bg-neutral-100 border-neutral-200 text-neutral-900'
            }`}
          />
        </div>
      </div>
    </header>
  );
};
