import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  Database, 
  Server, 
  HardDrive, 
  Zap, 
  Copy, 
  Check, 
  Download, 
  Layers, 
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Send
} from 'lucide-react';
import { CloudflareConfig, Novel } from '../types';
import { 
  CLOUDFLARE_D1_SCHEMA, 
  WRANGLER_TOML_TEMPLATE, 
  CLOUDFLARE_PAGES_FUNCTION_CODE,
  testCloudflareConnection,
  syncNovelToCloudflare
} from '../utils/cloudflareSync';

interface CloudflareModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CloudflareConfig;
  onSaveConfig: (cfg: CloudflareConfig) => void;
  novels: Novel[];
  isDark: boolean;
}

export const CloudflareModal: React.FC<CloudflareModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  novels,
  isDark
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'd1' | 'functions' | 'wrangler' | 'sync'>('architecture');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync settings
  const [endpoint, setEndpoint] = useState(config.apiEndpoint || '');
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleTestConnection = async () => {
    if (!endpoint) {
      setSyncStatus('Vui lòng nhập URL Cloudflare Pages / Worker endpoint');
      return;
    }
    setIsTesting(true);
    setSyncStatus('Đang kiểm tra kết nối tới Cloudflare...');
    const res = await testCloudflareConnection(endpoint, apiKey);
    setIsTesting(false);
    setSyncStatus(res.message);
  };

  const handleSyncAll = async () => {
    if (!endpoint) {
      setSyncStatus('Vui lòng nhập URL Cloudflare Pages / Worker endpoint');
      return;
    }
    setIsSyncing(true);
    setSyncStatus(`Đang đồng bộ ${novels.length} truyện lên Cloudflare D1 & KV...`);
    
    let successCount = 0;
    for (const novel of novels) {
      const ok = await syncNovelToCloudflare(endpoint, novel, apiKey);
      if (ok) successCount++;
    }

    setIsSyncing(false);
    setSyncStatus(`Đã đồng bộ thành công ${successCount}/${novels.length} truyện vào Cloudflare D1 & KV!`);
    
    // Save config
    onSaveConfig({
      ...config,
      apiEndpoint: endpoint,
      apiKey: apiKey,
      lastSyncedAt: new Date().toISOString()
    });
  };

  return (
    <div 
      id="cloudflare-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <div 
        id="cloudflare-modal-container"
        className={`w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden transition-all my-8 ${
          isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-inherit">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Kiến Trúc Cloudflare Serverless</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Full-stack: Frontend + Pages Functions + D1 SQL + KV Cache + R2 Storage
              </p>
            </div>
          </div>
          <button
            id="close-cloudflare-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-inherit px-6 overflow-x-auto gap-2 text-xs font-semibold pt-2">
          {[
            { id: 'architecture', label: 'Mô hình kiến trúc', icon: Layers },
            { id: 'd1', label: 'D1 SQL (Database)', icon: Database },
            { id: 'functions', label: 'Pages Functions (API)', icon: Server },
            { id: 'wrangler', label: 'wrangler.toml (Config)', icon: Zap },
            { id: 'sync', label: 'Đồng bộ trực tiếp', icon: RefreshCw }
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                id={`cf-tab-${t.id}`}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === t.id
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* TAB 1: ARCHITECTURE OVERVIEW */}
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">Mô hình tối ưu hóa tốc độ tải trang & chi phí $0</p>
                <p className="opacity-90 leading-relaxed">
                  Ứng dụng được thiết kế tương thích 100% với hệ sinh thái Serverless của Cloudflare. Với cơ chế lưu cục bộ IndexedDB + Cloudflare D1 SQL và KV Edge Caching, sách của bạn mở tức thì dưới 50ms ở bất kỳ đâu trên thế giới!
                </p>
              </div>

              {/* 4 Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pages Functions */}
                <div className="p-4 rounded-xl border border-inherit space-y-2">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                    <Server className="w-4 h-4" />
                    <h4>Cloudflare Pages Functions</h4>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Xử lý API routes tự động tại thư mục <code>functions/api/</code>. Chạy trực tiếp tại 300+ Edge locations, không cần bảo trì server.
                  </p>
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                    GET /api/novels, POST /api/progress
                  </span>
                </div>

                {/* D1 SQL */}
                <div className="p-4 rounded-xl border border-inherit space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <Database className="w-4 h-4" />
                    <h4>Cloudflare D1 SQL</h4>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Cơ sở dữ liệu quan hệ Serverless SQLite phân tán toàn cầu. Lưu trữ có cấu trúc: truyện, danh sách chương, tiến độ đọc và bookmark.
                  </p>
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                    SQLite Database Binding: env.DB
                  </span>
                </div>

                {/* KV Cache */}
                <div className="p-4 rounded-xl border border-inherit space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                    <Zap className="w-4 h-4" />
                    <h4>Cloudflare Workers KV</h4>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Bộ nhớ đệm siêu tốc (Ultra-low latency key-value). Lưu trữ nội dung chương truyện đã parse để người đọc mở chương mới trong chớp mắt.
                  </p>
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">
                    KV Cache: chapter:novelId:chIndex
                  </span>
                </div>

                {/* R2 Storage */}
                <div className="p-4 rounded-xl border border-inherit space-y-2">
                  <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-sm">
                    <HardDrive className="w-4 h-4" />
                    <h4>Cloudflare R2 Object Storage</h4>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Lưu trữ đối tượng tương thích S3 miễn phí egress. Dùng để lưu trữ nguyên gốc các tệp <code>.epub</code>, <code>.mobi</code> và ảnh bìa sách độ phân giải cao.
                  </p>
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono">
                    R2 Bucket: env.NOVEL_BUCKET
                  </span>
                </div>
              </div>

              {/* Deployment Steps Guide */}
              <div className="p-4 rounded-xl border border-inherit space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500">
                  Các bước triển khai lên Cloudflare (Chỉ mất 2 phút)
                </h4>
                <ol className="text-xs space-y-2 text-neutral-600 dark:text-neutral-300 list-decimal pl-4">
                  <li>Tạo cơ sở dữ liệu D1: <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono">npx wrangler d1 create novel-library-d1</code></li>
                  <li>Khởi tạo schema: <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono">npx wrangler d1 execute novel-library-d1 --file=schema.sql</code></li>
                  <li>Tạo KV namespace: <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono">npx wrangler kv:namespace create NOVEL_CACHE</code></li>
                  <li>Tạo R2 bucket: <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono">npx wrangler r2 bucket create novel-storage-r2</code></li>
                  <li>Build & Deploy: <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono">npm run build && npx wrangler pages deploy dist</code></li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: D1 SQL SCHEMA */}
          {activeTab === 'd1' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Tệp cấu trúc bảng D1 SQL tối ưu cho thư viện truyện, chương sách và tiến độ đọc.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(CLOUDFLARE_D1_SCHEMA, 'd1')}
                    className="px-3 py-1.5 text-xs rounded-lg border border-inherit hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 font-medium transition-colors"
                  >
                    {copiedKey === 'd1' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'd1' ? 'Đã sao chép' : 'Sao chép SQL'}</span>
                  </button>
                  <button
                    onClick={() => downloadFile('schema.sql', CLOUDFLARE_D1_SCHEMA)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải schema.sql</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-neutral-950 text-neutral-200 text-xs font-mono overflow-x-auto border border-neutral-800 max-h-96">
                <code>{CLOUDFLARE_D1_SCHEMA}</code>
              </pre>
            </div>
          )}

          {/* TAB 3: PAGES FUNCTIONS CODE */}
          {activeTab === 'functions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Cloudflare Pages Functions router (Lưu vào <code>functions/api/novels/[[path]].ts</code>)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(CLOUDFLARE_PAGES_FUNCTION_CODE, 'functions')}
                    className="px-3 py-1.5 text-xs rounded-lg border border-inherit hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 font-medium transition-colors"
                  >
                    {copiedKey === 'functions' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'functions' ? 'Đã sao chép' : 'Sao chép TypeScript'}</span>
                  </button>
                  <button
                    onClick={() => downloadFile('[[path]].ts', CLOUDFLARE_PAGES_FUNCTION_CODE)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải file .ts</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-neutral-950 text-neutral-200 text-xs font-mono overflow-x-auto border border-neutral-800 max-h-96">
                <code>{CLOUDFLARE_PAGES_FUNCTION_CODE}</code>
              </pre>
            </div>
          )}

          {/* TAB 4: WRANGLER.TOML */}
          {activeTab === 'wrangler' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Tệp cấu hình Wrangler kết nối D1, KV và R2 với Pages app.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(WRANGLER_TOML_TEMPLATE, 'wrangler')}
                    className="px-3 py-1.5 text-xs rounded-lg border border-inherit hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 font-medium transition-colors"
                  >
                    {copiedKey === 'wrangler' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'wrangler' ? 'Đã sao chép' : 'Sao chép toml'}</span>
                  </button>
                  <button
                    onClick={() => downloadFile('wrangler.toml', WRANGLER_TOML_TEMPLATE)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải wrangler.toml</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-neutral-950 text-neutral-200 text-xs font-mono overflow-x-auto border border-neutral-800 max-h-96">
                <code>{WRANGLER_TOML_TEMPLATE}</code>
              </pre>
            </div>
          )}

          {/* TAB 5: LIVE SYNC & REMOTE ENDPOINT */}
          {activeTab === 'sync' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 border border-inherit text-xs space-y-1.5">
                <p className="font-semibold">Kết nối & Đồng bộ hai chiều với Cloudflare Pages của bạn</p>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Sau khi bạn deploy Pages Functions và D1, hãy dán URL trang web của bạn vào đây (ví dụ: <code>https://novel-reader.pages.dev</code>). Ứng dụng sẽ đồng bộ toàn bộ sách và tiến độ đọc lên Cloudflare D1 & KV.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">
                    Cloudflare Pages URL / Worker Endpoint
                  </label>
                  <input
                    type="url"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://your-app.pages.dev"
                    className={`w-full px-3.5 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-mono ${
                      isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">
                    API Secret Token (Tùy chọn nếu bạn cài đặt bảo mật cho Functions)
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Bearer token hoặc CF Access secret"
                    className={`w-full px-3.5 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-mono ${
                      isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
                    }`}
                  />
                </div>

                {syncStatus && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                    {syncStatus}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                      isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>Kiểm tra kết nối</span>
                  </button>

                  <button
                    onClick={handleSyncAll}
                    disabled={isSyncing}
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Đồng bộ toàn bộ {novels.length} truyện lên D1 & KV</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
