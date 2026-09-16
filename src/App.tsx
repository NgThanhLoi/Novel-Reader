import React, { useState, useEffect } from 'react';
import { Novel, ReaderSettings, CloudflareConfig, NovelStatus } from './types';
import { 
  getAllNovels, 
  saveNovel, 
  deleteNovel, 
  getReaderSettings, 
  saveReaderSettings,
  getCloudflareConfig,
  saveCloudflareConfig,
  DEFAULT_SETTINGS
} from './utils/storage';
import { syncNovelToCloudflare } from './utils/cloudflareSync';
import { Navbar } from './components/Navbar';
import { LibraryView } from './components/LibraryView';
import { ReaderView } from './components/ReaderView';
import { UploadModal } from './components/UploadModal';
import { NovelDetailModal } from './components/NovelDetailModal';
import { CloudflareModal } from './components/CloudflareModal';
import { StatsModal } from './components/StatsModal';

export default function App() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [activeNovelId, setActiveNovelId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'library' | 'reader' | 'stats'>('library');
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [cloudflareConfig, setCloudflareConfig] = useState<CloudflareConfig>(getCloudflareConfig());
  
  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCloudflareOpen, setIsCloudflareOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [detailNovel, setDetailNovel] = useState<Novel | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      const storedNovels = await getAllNovels();
      setNovels(storedNovels);
      const settings = getReaderSettings();
      setReaderSettings(settings);
    };
    loadData();
  }, []);

  // Sync document class for dark mode
  const isDark = readerSettings.theme === 'dark' || 
                 readerSettings.theme === 'oled' || 
                 readerSettings.theme === 'nord' || 
                 readerSettings.theme === 'emerald';

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Handle novel reading
  const activeNovel = novels.find(n => n.id === activeNovelId) || null;

  const handleReadNovel = (novel: Novel, chapterIndex?: number) => {
    if (chapterIndex !== undefined && chapterIndex !== novel.progress.currentChapterIndex) {
      const updated: Novel = {
        ...novel,
        progress: {
          ...novel.progress,
          currentChapterIndex: chapterIndex,
          scrollPercentage: 0,
          lastReadAt: new Date().toISOString()
        }
      };
      saveNovel(updated);
      setNovels(prev => prev.map(n => n.id === updated.id ? updated : n));
    }
    setActiveNovelId(novel.id);
    setCurrentView('reader');
    setDetailNovel(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update reading progress
  const handleUpdateProgress = (novelId: string, chapterIndex: number, scrollPercent: number) => {
    setNovels(prev => prev.map(n => {
      if (n.id === novelId) {
        const updatedProgress = {
          ...n.progress,
          currentChapterIndex: chapterIndex,
          scrollPercentage: scrollPercent,
          lastReadAt: new Date().toISOString(),
          totalTimeSpentSeconds: (n.progress.totalTimeSpentSeconds || 0) + 1
        };
        const updatedNovel: Novel = {
          ...n,
          progress: updatedProgress,
          updatedAt: new Date().toISOString()
        };
        saveNovel(updatedNovel);

        // Auto sync with remote Cloudflare worker if configured
        if (cloudflareConfig.syncEnabled && cloudflareConfig.apiEndpoint) {
          syncNovelToCloudflare(cloudflareConfig.apiEndpoint, updatedNovel, cloudflareConfig.apiKey).catch(() => {});
        }

        return updatedNovel;
      }
      return n;
    }));
  };

  // Add Bookmark
  const handleAddBookmark = (novelId: string, chapterIndex: number, chapterTitle: string, snippet: string) => {
    const novel = novels.find(n => n.id === novelId);
    if (!novel) return;

    const newBookmark = {
      id: `bm-${Date.now()}`,
      novelId,
      chapterIndex,
      chapterTitle,
      percentage: novel.progress.scrollPercentage,
      textSnippet: snippet,
      createdAt: new Date().toISOString()
    };

    const updated: Novel = {
      ...novel,
      bookmarks: [newBookmark, ...(novel.bookmarks || [])]
    };

    saveNovel(updated);
    setNovels(prev => prev.map(n => n.id === novelId ? updated : n));
    showToast(`Đã đánh dấu trang: "${chapterTitle}"`);
  };

  // Save new novel from upload
  const handleSaveNovel = async (newNovel: Novel) => {
    await saveNovel(newNovel);
    setNovels(prev => [newNovel, ...prev]);
    showToast(`Đã thêm thành công truyện "${newNovel.title}" (${newNovel.chapters.length} chương)`);
    
    // Auto sync to Cloudflare if enabled
    if (cloudflareConfig.syncEnabled && cloudflareConfig.apiEndpoint) {
      syncNovelToCloudflare(cloudflareConfig.apiEndpoint, newNovel, cloudflareConfig.apiKey).catch(() => {});
    }
  };

  // Delete novel
  const handleDeleteNovel = async (id: string) => {
    await deleteNovel(id);
    setNovels(prev => prev.filter(n => n.id !== id));
    if (activeNovelId === id) {
      setActiveNovelId(null);
      setCurrentView('library');
    }
    showToast('Đã xóa tác phẩm khỏi thư viện');
  };

  // Toggle favorite
  const handleToggleFavorite = (novel: Novel) => {
    const newStatus: NovelStatus = novel.status === 'favorite' ? 'reading' : 'favorite';
    const updated: Novel = { ...novel, status: newStatus };
    saveNovel(updated);
    setNovels(prev => prev.map(n => n.id === novel.id ? updated : n));
    showToast(newStatus === 'favorite' ? `Đã thêm "${novel.title}" vào mục Yêu thích` : `Đã bỏ yêu thích`);
  };

  // Update Status
  const handleUpdateStatus = (novelId: string, status: NovelStatus) => {
    setNovels(prev => prev.map(n => {
      if (n.id === novelId) {
        const updated: Novel = { ...n, status };
        saveNovel(updated);
        return updated;
      }
      return n;
    }));
  };

  // Update settings
  const handleUpdateSettings = (newSettings: Partial<ReaderSettings>) => {
    setReaderSettings(prev => {
      const merged = { ...prev, ...newSettings };
      saveReaderSettings(merged);
      return merged;
    });
  };

  // Toggle night mode quickly
  const handleToggleNightMode = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    handleUpdateSettings({ theme: nextTheme });
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50/70 text-neutral-900'
    }`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          id="toast-notification"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 py-2 px-4 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xl text-xs font-semibold border border-neutral-700 animate-bounce"
        >
          {toastMessage}
        </div>
      )}

      {/* Primary Top Header */}
      {currentView !== 'reader' && (
        <Navbar
          currentView={currentView}
          onNavigate={(view) => {
            if (view === 'stats') {
              setIsStatsOpen(true);
            } else {
              setCurrentView(view);
            }
          }}
          hasActiveNovel={!!activeNovel}
          activeNovelTitle={activeNovel?.title}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenCloudflare={() => setIsCloudflareOpen(true)}
          onOpenStats={() => setIsStatsOpen(true)}
          theme={readerSettings.theme}
          onToggleNightMode={handleToggleNightMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {/* Main View Switcher */}
      {currentView === 'reader' && activeNovel ? (
        <ReaderView
          novel={activeNovel}
          onBackToLibrary={() => setCurrentView('library')}
          onUpdateProgress={handleUpdateProgress}
          onAddBookmark={handleAddBookmark}
          settings={readerSettings}
          onUpdateSettings={handleUpdateSettings}
        />
      ) : (
        <LibraryView
          novels={novels}
          searchQuery={searchQuery}
          onReadNovel={handleReadNovel}
          onSelectDetail={(novel) => setDetailNovel(novel)}
          onToggleFavorite={handleToggleFavorite}
          onDeleteNovel={handleDeleteNovel}
          onOpenUpload={() => setIsUploadOpen(true)}
          isDark={isDark}
        />
      )}

      {/* Upload Novel Modal (.epub, .mobi, .json, .txt) */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSaveNovel={handleSaveNovel}
        isDark={isDark}
      />

      {/* Novel Detail Modal */}
      <NovelDetailModal
        novel={detailNovel}
        isOpen={!!detailNovel}
        onClose={() => setDetailNovel(null)}
        onReadChapter={handleReadNovel}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDeleteNovel}
        isDark={isDark}
      />

      {/* Cloudflare Serverless Architecture Modal */}
      <CloudflareModal
        isOpen={isCloudflareOpen}
        onClose={() => setIsCloudflareOpen(false)}
        config={cloudflareConfig}
        onSaveConfig={(cfg) => {
          setCloudflareConfig(cfg);
          saveCloudflareConfig(cfg);
        }}
        novels={novels}
        isDark={isDark}
      />

      {/* Library Statistics Modal */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        novels={novels}
        isDark={isDark}
      />
    </div>
  );
}
