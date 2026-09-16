import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Settings2, 
  ListOrdered, 
  Bookmark, 
  BookmarkCheck,
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw,
  Sun,
  Moon,
  Type,
  AlignLeft,
  AlignJustify,
  Sliders,
  Check,
  Share2
} from 'lucide-react';
import { Novel, Chapter, ReaderSettings, ReaderTheme, ReaderFontFamily, ReaderContentWidth } from '../types';

interface ReaderViewProps {
  novel: Novel;
  onBackToLibrary: () => void;
  onUpdateProgress: (novelId: string, chapterIndex: number, scrollPercent: number) => void;
  onAddBookmark: (novelId: string, chapterIndex: number, chapterTitle: string, snippet: string) => void;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  novel,
  onBackToLibrary,
  onUpdateProgress,
  onAddBookmark,
  settings,
  onUpdateSettings
}) => {
  const currentChapterIdx = novel.progress.currentChapterIndex;
  const currentChapter = novel.chapters[currentChapterIdx] || novel.chapters[0] || {
    id: 'empty',
    chapterIndex: 0,
    title: 'Không có chương',
    content: 'Nội dung truyện rỗng.',
    wordCount: 0
  };

  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [showTocDrawer, setShowTocDrawer] = useState(false);
  const [showBookmarksDrawer, setShowBookmarksDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(novel.progress.scrollPercentage || 0);

  // Auto Scroll
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const autoScrollTimerRef = useRef<number | null>(null);

  // Text-To-Speech (TTS)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [showTtsControls, setShowTtsControls] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Theme styling map
  const themeClasses: Record<ReaderTheme, { bg: string; text: string; header: string; border: string; accent: string }> = {
    light: {
      bg: 'bg-neutral-50',
      text: 'text-neutral-800',
      header: 'bg-white/90 text-neutral-800 border-neutral-200/80',
      border: 'border-neutral-200',
      accent: 'text-amber-700'
    },
    sepia: {
      bg: 'bg-[#f4ecd8]',
      text: 'text-[#433422]',
      header: 'bg-[#ebe2cd]/90 text-[#433422] border-[#ded4bd]',
      border: 'border-[#ded4bd]',
      accent: 'text-[#8c5025]'
    },
    dark: {
      bg: 'bg-[#18181b]',
      text: 'text-[#d4d4d8]',
      header: 'bg-[#212124]/90 text-[#e4e4e7] border-[#2e2e33]',
      border: 'border-[#2e2e33]',
      accent: 'text-amber-400'
    },
    oled: {
      bg: 'bg-black',
      text: 'text-neutral-300',
      header: 'bg-neutral-950/90 text-neutral-100 border-neutral-900',
      border: 'border-neutral-900',
      accent: 'text-amber-400'
    },
    nord: {
      bg: 'bg-[#242933]',
      text: 'text-[#d8dee9]',
      header: 'bg-[#2e3440]/90 text-[#eceff4] border-[#3b4252]',
      border: 'border-[#3b4252]',
      accent: 'text-[#88c0d0]'
    },
    emerald: {
      bg: 'bg-[#0f1f1a]',
      text: 'text-[#d1e7dd]',
      header: 'bg-[#142822]/90 text-[#e6f4ea] border-[#1e3b33]',
      border: 'border-[#1e3b33]',
      accent: 'text-emerald-400'
    }
  };

  const currentThemeStyle = themeClasses[settings.theme] || themeClasses.light;

  // Font family map
  const fontClassMap: Record<ReaderFontFamily, string> = {
    literata: 'font-literata',
    merriweather: 'font-merriweather',
    vietnam: 'font-vietnam',
    nunito: 'font-nunito',
    mono: 'font-mono'
  };

  // Content width map
  const widthClassMap: Record<ReaderContentWidth, string> = {
    narrow: 'max-w-xl',
    medium: 'max-w-3xl',
    wide: 'max-w-4xl',
    full: 'max-w-full px-4 md:px-12'
  };

  // Init Voices for Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setTtsVoices(voices);
        // Find Vietnamese or default voice
        const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VN'));
        if (viVoice) {
          setSelectedVoice(viVoice);
        } else if (voices.length > 0) {
          setSelectedVoice(voices[0]);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle TTS Play / Pause
  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt của bạn không hỗ trợ tính năng Đọc bằng giọng nói (SpeechSynthesis)');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentChapter.content);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = settings.speechRate || 1.0;
      utterance.pitch = settings.speechPitch || 1.0;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Auto Scroll effect
  useEffect(() => {
    if (isAutoScrolling) {
      const scrollStep = () => {
        window.scrollBy({ top: 1, behavior: 'smooth' });
        autoScrollTimerRef.current = window.setTimeout(scrollStep, 100 / settings.autoScrollSpeed);
      };
      scrollStep();
    } else {
      if (autoScrollTimerRef.current) {
        clearTimeout(autoScrollTimerRef.current);
      }
    }

    return () => {
      if (autoScrollTimerRef.current) clearTimeout(autoScrollTimerRef.current);
    };
  }, [isAutoScrolling, settings.autoScrollSpeed]);

  // Scroll listener to auto-calculate progress & toggle header
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      if (docHeight > 0) {
        const percent = Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100)));
        setScrollProgress(percent);
        onUpdateProgress(novel.id, currentChapterIdx, percent);
      }

      // Hide header when scrolling down, show when scrolling up
      if (scrollTop > lastScrollY.current && scrollTop > 120) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
      lastScrollY.current = scrollTop;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [novel.id, currentChapterIdx, onUpdateProgress]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft') {
        goToPreviousChapter();
      } else if (e.key === 'ArrowRight') {
        goToNextChapter();
      } else if (e.key === 'f') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChapterIdx, novel.chapters.length]);

  const goToChapter = (index: number) => {
    if (index >= 0 && index < novel.chapters.length) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      onUpdateProgress(novel.id, index, 0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setShowTocDrawer(false);
    }
  };

  const goToPreviousChapter = () => {
    if (currentChapterIdx > 0) {
      goToChapter(currentChapterIdx - 1);
    }
  };

  const goToNextChapter = () => {
    if (currentChapterIdx < novel.chapters.length - 1) {
      goToChapter(currentChapterIdx + 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleCreateBookmark = () => {
    const snippet = currentChapter.content.substring(0, 100).trim() + '...';
    onAddBookmark(novel.id, currentChapterIdx, currentChapter.title, snippet);
  };

  // Convert raw text content into beautiful paragraphs
  const paragraphs = currentChapter.content.split(/\n\n+/).filter(p => p.trim().length > 0);

  return (
    <div 
      id="reader-view-root"
      ref={containerRef}
      className={`min-h-screen transition-colors duration-300 ${currentThemeStyle.bg} ${currentThemeStyle.text}`}
    >
      {/* Floating Reader Header */}
      <header
        id="reader-top-header"
        className={`fixed top-0 inset-x-0 z-40 transition-transform duration-300 border-b backdrop-blur-md ${
          currentThemeStyle.header
        } ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Left: Back button & Novel Title */}
          <div className="flex items-center gap-3 truncate">
            <button
              id="reader-back-to-library-btn"
              onClick={onBackToLibrary}
              className={`p-2 rounded-lg border transition-colors ${currentThemeStyle.border} hover:opacity-80`}
              title="Quay lại Thư viện"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="truncate">
              <h2 className="text-xs font-bold truncate leading-tight">{novel.title}</h2>
              <p className="text-[11px] opacity-70 truncate">{currentChapter.title}</p>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Table of Contents Drawer Button */}
            <button
              id="reader-toc-btn"
              onClick={() => setShowTocDrawer(true)}
              className={`p-2 rounded-lg border transition-colors ${currentThemeStyle.border} hover:opacity-80`}
              title="Mục lục các chương"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            {/* Bookmark Current Spot */}
            <button
              id="reader-bookmark-btn"
              onClick={handleCreateBookmark}
              className={`p-2 rounded-lg border transition-colors ${currentThemeStyle.border} hover:opacity-80`}
              title="Đánh dấu trang hiện tại"
            >
              <Bookmark className="w-4 h-4" />
            </button>

            {/* TTS Audio Reading */}
            <button
              id="reader-tts-btn"
              onClick={() => setShowTtsControls(!showTtsControls)}
              className={`p-2 rounded-lg border transition-colors ${currentThemeStyle.border} ${
                isSpeaking ? 'bg-amber-500 text-white border-amber-600' : 'hover:opacity-80'
              }`}
              title="Đọc to bằng giọng nói (TTS)"
            >
              {isSpeaking ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Reader Appearance Settings Toggle */}
            <button
              id="reader-settings-toggle-btn"
              onClick={() => setShowSettingsPopover(!showSettingsPopover)}
              className={`p-2 rounded-lg border transition-colors ${currentThemeStyle.border} ${
                showSettingsPopover ? 'bg-amber-500/20 text-amber-500 border-amber-500/50' : 'hover:opacity-80'
              }`}
              title="Tùy chỉnh cỡ chữ, phông chữ, chế độ đêm"
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              id="reader-fullscreen-btn"
              onClick={toggleFullscreen}
              className={`hidden sm:inline-flex p-2 rounded-lg border transition-colors ${currentThemeStyle.border} hover:opacity-80`}
              title={isFullscreen ? 'Thoát toàn màn hình (F)' : 'Toàn màn hình (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Reading Progress Indicator Line */}
        <div className="w-full h-0.5 bg-black/10 dark:bg-white/10">
          <div 
            className="h-full bg-amber-500 transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </header>

      {/* TTS Controls Bar */}
      {showTtsControls && (
        <div 
          id="tts-controls-bar"
          className={`fixed top-14 inset-x-0 z-30 py-2.5 px-4 border-b backdrop-blur-md shadow-md flex flex-wrap items-center justify-center gap-4 text-xs ${
            currentThemeStyle.header
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              id="tts-play-pause-btn"
              onClick={toggleSpeech}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isSpeaking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSpeaking ? 'Tạm dừng đọc' : 'Bắt đầu đọc'}</span>
            </button>

            <button
              id="tts-stop-btn"
              onClick={() => {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
              }}
              className="p-1.5 rounded-lg border hover:opacity-80"
              title="Dừng đọc"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Voice select */}
          {ttsVoices.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="opacity-70">Giọng đọc:</span>
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const v = ttsVoices.find(item => item.name === e.target.value);
                  if (v) setSelectedVoice(v);
                }}
                className="px-2 py-1 rounded border text-xs max-w-[150px] truncate bg-transparent focus:outline-none"
              >
                {ttsVoices.map(v => (
                  <option key={v.name} value={v.name} className="text-neutral-900 bg-white">
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Speed Rate */}
          <div className="flex items-center gap-1.5">
            <span className="opacity-70">Tốc độ: {settings.speechRate}x</span>
            <input
              type="range"
              min="0.75"
              max="1.75"
              step="0.25"
              value={settings.speechRate}
              onChange={(e) => onUpdateSettings({ speechRate: parseFloat(e.target.value) })}
              className="w-20 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Main Reading Text Area */}
      <main 
        id="reader-content-container"
        ref={contentRef}
        className={`mx-auto pt-24 pb-32 px-5 sm:px-8 transition-all duration-200 ${
          widthClassMap[settings.contentWidth]
        }`}
      >
        {/* Chapter Title & Header */}
        <div className="mb-10 text-center border-b pb-6 border-current/10">
          <span className="text-xs uppercase tracking-widest opacity-60 font-semibold mb-2 block">
            {novel.title} • Chương {currentChapterIdx + 1} / {novel.chapters.length}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight leading-tight">
            {currentChapter.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-xs opacity-60 mt-3">
            <span>{currentChapter.wordCount.toLocaleString()} từ</span>
            <span>•</span>
            <span>~{Math.ceil(currentChapter.wordCount / 220)} phút đọc</span>
          </div>
        </div>

        {/* Chapter Body Text */}
        <article
          id="reader-body-text"
          className={`space-y-6 ${fontClassMap[settings.fontFamily]} ${
            settings.textAlign === 'justify' ? 'text-justify' : 'text-left'
          }`}
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight
          }}
        >
          {paragraphs.map((p, idx) => (
            <p key={idx} className="tracking-normal text-pretty">
              {p}
            </p>
          ))}
        </article>

        {/* Bottom Chapter Navigation Bar */}
        <div className="mt-16 pt-8 border-t border-current/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            id="reader-prev-chapter-btn"
            disabled={currentChapterIdx <= 0}
            onClick={goToPreviousChapter}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
              currentChapterIdx <= 0 
                ? 'opacity-40 cursor-not-allowed border-current/10' 
                : 'border-current/20 hover:bg-current/5 active:scale-95 cursor-pointer'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Chương trước</span>
          </button>

          <div className="text-center text-xs opacity-75">
            <span className="font-semibold">Chương {currentChapterIdx + 1}</span> của {novel.chapters.length}
          </div>

          <button
            id="reader-next-chapter-btn"
            disabled={currentChapterIdx >= novel.chapters.length - 1}
            onClick={goToNextChapter}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
              currentChapterIdx >= novel.chapters.length - 1 
                ? 'opacity-40 cursor-not-allowed border-current/10' 
                : 'bg-amber-600 hover:bg-amber-700 text-white border-transparent active:scale-95 cursor-pointer shadow-sm'
            }`}
          >
            <span>Chương tiếp theo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Reader Appearance Popover Panel */}
      {showSettingsPopover && (
        <div 
          id="reader-settings-panel"
          className={`fixed bottom-4 sm:bottom-auto sm:top-16 right-4 z-50 w-[calc(100vw-2rem)] sm:w-88 p-5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all ${
            currentThemeStyle.header
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-current/10 mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-500" />
              <span>Tùy Chỉnh Giao Diện Đọc</span>
            </h3>
            <button 
              id="close-reader-settings-btn"
              onClick={() => setShowSettingsPopover(false)}
              className="text-xs opacity-60 hover:opacity-100 p-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. Theme Color Selector */}
            <div>
              <label className="block font-semibold opacity-75 mb-2">Màu nền & Chế độ đọc:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'light', name: 'Sáng', bg: 'bg-white text-neutral-900 border-neutral-300' },
                  { id: 'sepia', name: 'Giấy ấm', bg: 'bg-[#f4ecd8] text-[#433422] border-[#ded4bd]' },
                  { id: 'dark', name: 'Đêm', bg: 'bg-[#18181b] text-neutral-200 border-[#333]' },
                  { id: 'oled', name: 'AMOLED', bg: 'bg-black text-white border-neutral-800' },
                  { id: 'nord', name: 'Phiến đá', bg: 'bg-[#242933] text-neutral-200 border-[#3b4252]' },
                  { id: 'emerald', name: 'Xanh dịu', bg: 'bg-[#0f1f1a] text-[#d1e7dd] border-[#1e3b33]' }
                ].map(t => (
                  <button
                    key={t.id}
                    id={`theme-btn-${t.id}`}
                    onClick={() => onUpdateSettings({ theme: t.id as ReaderTheme })}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      t.bg
                    } ${settings.theme === t.id ? 'ring-2 ring-amber-500 scale-[1.02]' : 'opacity-80 hover:opacity-100'}`}
                  >
                    <span>{t.name}</span>
                    {settings.theme === t.id && <Check className="w-3.5 h-3.5 text-amber-500" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Font Size Control */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-semibold opacity-75">Cỡ chữ: {settings.fontSize}px</label>
                <div className="flex items-center gap-1">
                  <button
                    id="decrease-font-btn"
                    onClick={() => onUpdateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
                    className="px-2 py-0.5 rounded border border-current/20 font-bold hover:bg-current/10"
                  >
                    A-
                  </button>
                  <button
                    id="increase-font-btn"
                    onClick={() => onUpdateSettings({ fontSize: Math.min(34, settings.fontSize + 1) })}
                    className="px-2 py-0.5 rounded border border-current/20 font-bold hover:bg-current/10"
                  >
                    A+
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="14"
                max="34"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* 3. Font Family Selector */}
            <div>
              <label className="block font-semibold opacity-75 mb-2">Kiểu chữ (Phông chữ):</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'literata', name: 'Literata (Sách)', font: 'font-literata' },
                  { id: 'merriweather', name: 'Merriweather (Cổ điển)', font: 'font-merriweather' },
                  { id: 'vietnam', name: 'Be Vietnam (Hiện đại)', font: 'font-vietnam' },
                  { id: 'nunito', name: 'Nunito (Mềm mại)', font: 'font-nunito' }
                ].map(f => (
                  <button
                    key={f.id}
                    id={`font-btn-${f.id}`}
                    onClick={() => onUpdateSettings({ fontFamily: f.id as ReaderFontFamily })}
                    className={`p-2 rounded-lg border text-left transition-all ${f.font} ${
                      settings.fontFamily === f.id
                        ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold'
                        : 'border-current/15 opacity-75 hover:opacity-100'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Line Spacing & Width */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold opacity-75 mb-1.5">Giãn dòng:</label>
                <div className="flex gap-1">
                  {[1.5, 1.8, 2.1].map(spacing => (
                    <button
                      key={spacing}
                      onClick={() => onUpdateSettings({ lineHeight: spacing })}
                      className={`flex-1 py-1 text-center rounded border transition-colors ${
                        settings.lineHeight === spacing
                          ? 'bg-amber-500 text-white border-amber-500 font-bold'
                          : 'border-current/20 opacity-75'
                      }`}
                    >
                      {spacing}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold opacity-75 mb-1.5">Canh lề:</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => onUpdateSettings({ textAlign: 'left' })}
                    className={`flex-1 py-1 rounded border flex items-center justify-center ${
                      settings.textAlign === 'left' ? 'bg-amber-500 text-white border-amber-500' : 'border-current/20'
                    }`}
                    title="Căn trái"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ textAlign: 'justify' })}
                    className={`flex-1 py-1 rounded border flex items-center justify-center ${
                      settings.textAlign === 'justify' ? 'bg-amber-500 text-white border-amber-500' : 'border-current/20'
                    }`}
                    title="Căn đều hai bên"
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Content Width */}
            <div>
              <label className="block font-semibold opacity-75 mb-1.5">Độ rộng khung đọc:</label>
              <div className="grid grid-cols-4 gap-1">
                {(['narrow', 'medium', 'wide', 'full'] as ReaderContentWidth[]).map(w => (
                  <button
                    key={w}
                    onClick={() => onUpdateSettings({ contentWidth: w })}
                    className={`py-1 text-center rounded border capitalize text-[11px] ${
                      settings.contentWidth === w ? 'bg-amber-500 text-white border-amber-500 font-bold' : 'border-current/20'
                    }`}
                  >
                    {w === 'narrow' ? 'Hẹp' : w === 'medium' ? 'Vừa' : w === 'wide' ? 'Rộng' : 'Tràn'}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Auto Scroll Toggle */}
            <div className="pt-2 border-t border-current/10 flex items-center justify-between">
              <span className="font-semibold">Tự động cuộn trang:</span>
              <button
                id="auto-scroll-toggle-btn"
                onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  isAutoScrolling ? 'bg-amber-600 text-white' : 'bg-current/10 text-current'
                }`}
              >
                {isAutoScrolling ? 'Đang cuộn (Bật)' : 'Tắt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table of Contents Slide-over Drawer */}
      {showTocDrawer && (
        <div 
          id="toc-drawer-overlay"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end"
          onClick={() => setShowTocDrawer(false)}
        >
          <div 
            id="toc-drawer-content"
            className={`w-full max-w-sm h-full shadow-2xl p-5 flex flex-col transition-transform ${currentThemeStyle.bg} ${currentThemeStyle.text}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-current/10">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-amber-500" />
                <span>Mục Lục ({novel.chapters.length} chương)</span>
              </h3>
              <button 
                id="close-toc-btn"
                onClick={() => setShowTocDrawer(false)}
                className="p-1 rounded-lg hover:bg-current/10 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-1 pr-1">
              {novel.chapters.map((ch) => {
                const isSelected = ch.chapterIndex === currentChapterIdx;
                return (
                  <button
                    key={ch.id}
                    id={`toc-chapter-item-${ch.chapterIndex}`}
                    onClick={() => goToChapter(ch.chapterIndex)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30'
                        : 'hover:bg-current/5 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span className="truncate pr-2">{ch.title}</span>
                    <span className="text-[10px] opacity-60 shrink-0">{ch.wordCount.toLocaleString()} từ</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
