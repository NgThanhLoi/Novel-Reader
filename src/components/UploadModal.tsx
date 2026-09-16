import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Book, 
  Code, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  Plus,
  Trash2
} from 'lucide-react';
import { Novel, NovelFormat, Chapter } from '../types';
import { parseEpubFile, parseMobiFile, parseJsonFile, parseTxtFile, splitIntoChapters } from '../utils/parser';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNovel: (novel: Novel) => void;
  isDark: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSaveNovel,
  isDark
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  
  // Parsed Draft State
  const [draftTitle, setDraftTitle] = useState('');
  const [draftAuthor, setDraftAuthor] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftGenres, setDraftGenres] = useState<string>('Tiểu thuyết, E-Book');
  const [draftCoverUrl, setDraftCoverUrl] = useState('');
  const [draftFormat, setDraftFormat] = useState<NovelFormat>('epub');
  const [draftChapters, setDraftChapters] = useState<Chapter[]>([]);
  const [totalWords, setTotalWords] = useState(0);

  // Manual input state
  const [manualText, setManualText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetDraft = () => {
    setDraftTitle('');
    setDraftAuthor('');
    setDraftDescription('');
    setDraftGenres('Tiểu thuyết, E-Book');
    setDraftCoverUrl('');
    setDraftChapters([]);
    setTotalWords(0);
    setParseError(null);
    setManualText('');
  };

  const handleFileSelect = async (file: File) => {
    setIsParsing(true);
    setParseError(null);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let result;

      if (extension === 'epub') {
        result = await parseEpubFile(file);
      } else if (extension === 'mobi') {
        result = await parseMobiFile(file);
      } else if (extension === 'json') {
        result = await parseJsonFile(file);
      } else if (extension === 'txt' || extension === 'md') {
        result = await parseTxtFile(file);
      } else {
        throw new Error(`Định dạng .${extension} không được hỗ trợ. Vui lòng chọn tệp .epub, .mobi, .json hoặc .txt`);
      }

      setDraftTitle(result.title);
      setDraftAuthor(result.author);
      setDraftDescription(result.description);
      setDraftGenres(result.genres.join(', '));
      if (result.coverUrl) setDraftCoverUrl(result.coverUrl);
      setDraftFormat(result.sourceFormat);
      setDraftChapters(result.chapters);

      const words = result.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
      setTotalWords(words);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setParseError(err.message || 'Không thể đọc nội dung tệp. Vui lòng kiểm tra lại định dạng.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleManualParse = () => {
    if (!draftTitle.trim()) {
      setParseError('Vui lòng nhập tên truyện');
      return;
    }
    if (!manualText.trim()) {
      setParseError('Vui lòng dán nội dung văn bản truyện');
      return;
    }

    const chapters = splitIntoChapters(manualText);
    setDraftChapters(chapters);
    const words = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
    setTotalWords(words);
    setDraftFormat('manual');
    setParseError(null);
  };

  const handleConfirmSave = () => {
    if (!draftTitle.trim()) {
      setParseError('Tên truyện không được để trống');
      return;
    }

    if (draftChapters.length === 0) {
      setParseError('Chưa có chương truyện nào được phân tích hoặc tải lên');
      return;
    }

    const novel: Novel = {
      id: `novel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: draftTitle.trim(),
      author: draftAuthor.trim() || 'Khuyết danh',
      description: draftDescription.trim() || 'Chưa có tóm tắt',
      coverUrl: draftCoverUrl || undefined,
      genres: draftGenres.split(',').map(g => g.trim()).filter(Boolean),
      sourceFormat: draftFormat,
      chapters: draftChapters,
      status: 'reading',
      progress: {
        currentChapterIndex: 0,
        scrollPercentage: 0,
        lastReadAt: new Date().toISOString(),
        totalTimeSpentSeconds: 0
      },
      bookmarks: [],
      totalWords: totalWords || draftChapters.reduce((sum, ch) => sum + ch.wordCount, 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveNovel(novel);
    resetDraft();
    onClose();
  };

  return (
    <div 
      id="upload-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <div 
        id="upload-modal-container"
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden transition-all my-8 ${
          isDark 
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100' 
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Thêm Truyện Mới</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Hỗ trợ tệp EPUB, MOBI, JSON hoặc văn bản TXT
              </p>
            </div>
          </div>
          <button
            id="close-upload-modal-btn"
            onClick={() => { resetDraft(); onClose(); }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-inherit px-6 pt-3 gap-6">
          <button
            id="tab-upload-file-btn"
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            Tải lên tệp (EPUB, MOBI, JSON, TXT)
          </button>
          <button
            id="tab-manual-input-btn"
            onClick={() => setActiveTab('manual')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'manual'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            Dán văn bản thủ công
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Error Message */}
          {parseError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {activeTab === 'upload' ? (
            <div>
              {/* Drag Drop Area */}
              <div
                id="file-dropzone"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-amber-500 bg-amber-500/5'
                    : isDark
                      ? 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/40 hover:bg-neutral-800/80'
                      : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50 hover:bg-neutral-100/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".epub,.mobi,.json,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                {isParsing ? (
                  <div className="flex flex-col items-center justify-center py-4">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
                    <p className="text-sm font-semibold">Đang giải nén & phân tích chương truyện...</p>
                    <p className="text-xs text-neutral-400 mt-1">Hệ thống đang trích xuất nội dung, bìa và cấu trúc sách</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold mb-1">
                      Kéo thả tệp vào đây hoặc <span className="text-amber-600 dark:text-amber-400 underline">duyệt tệp</span>
                    </p>
                    <p className="text-xs text-neutral-400 max-w-sm">
                      Hỗ trợ sách điện tử: <strong>.epub</strong>, <strong>.mobi</strong>, <strong>.json</strong> hoặc <strong>.txt</strong>
                    </p>

                    {/* Supported Format Pills */}
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        EPUB 2 / 3
                      </span>
                      <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        MOBI (PalmDOC)
                      </span>
                      <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        JSON Schema
                      </span>
                      <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        TXT Auto-split
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Manual Input Tab */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-neutral-500">
                  Tên truyện *
                </label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Ví dụ: Tiếu Ngạo Giang Hồ"
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                    isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-neutral-500">
                  Tác giả
                </label>
                <input
                  type="text"
                  value={draftAuthor}
                  onChange={(e) => setDraftAuthor(e.target.value)}
                  placeholder="Ví dụ: Kim Dung"
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                    isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-neutral-500">
                  Dán nội dung truyện (Hệ thống tự động tách theo "Chương X" hoặc "Hồi X") *
                </label>
                <textarea
                  rows={6}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Dán toàn bộ văn bản truyện hoặc các chương vào đây..."
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                    isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>

              <button
                id="parse-manual-text-btn"
                type="button"
                onClick={handleManualParse}
                className="w-full py-2 text-xs font-semibold rounded-lg bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors"
              >
                Phân tích cấu trúc chương
              </button>
            </div>
          )}

          {/* Parsed Preview Section */}
          {draftChapters.length > 0 && (
            <div className={`p-4 rounded-xl border space-y-4 ${
              isDark ? 'bg-neutral-800/50 border-neutral-700/80' : 'bg-amber-50/40 border-amber-200/60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đã phân tích thành công ({draftChapters.length} chương - ~{totalWords.toLocaleString()} từ)</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded uppercase font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                  {draftFormat}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                    Tên truyện
                  </label>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                      isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                    Tác giả
                  </label>
                  <input
                    type="text"
                    value={draftAuthor}
                    onChange={(e) => setDraftAuthor(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                      isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                  Thể loại (phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={draftGenres}
                  onChange={(e) => setDraftGenres(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                    isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                  Tóm tắt tác phẩm
                </label>
                <textarea
                  rows={2}
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                    isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
                  }`}
                />
              </div>

              {/* Chapter preview list */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                  Danh sách chương ({draftChapters.length})
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 text-xs pr-1">
                  {draftChapters.slice(0, 10).map((ch, i) => (
                    <div 
                      key={ch.id} 
                      className={`flex justify-between items-center px-2.5 py-1 rounded text-[11px] ${
                        isDark ? 'bg-neutral-800/80' : 'bg-white/80'
                      }`}
                    >
                      <span className="truncate max-w-[280px] font-medium">{ch.title}</span>
                      <span className="text-neutral-400 shrink-0">{ch.wordCount.toLocaleString()} từ</span>
                    </div>
                  ))}
                  {draftChapters.length > 10 && (
                    <p className="text-center text-[10px] text-neutral-400 pt-1">
                      ... và {draftChapters.length - 10} chương khác
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-inherit bg-inherit">
          <button
            id="cancel-upload-btn"
            type="button"
            onClick={() => { resetDraft(); onClose(); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              isDark 
                ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' 
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            Hủy
          </button>

          <button
            id="confirm-save-novel-btn"
            type="button"
            disabled={draftChapters.length === 0}
            onClick={handleConfirmSave}
            className={`px-5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all ${
              draftChapters.length > 0
                ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer active:scale-95'
                : 'bg-neutral-300 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Lưu vào Thư viện</span>
          </button>
        </div>
      </div>
    </div>
  );
};
