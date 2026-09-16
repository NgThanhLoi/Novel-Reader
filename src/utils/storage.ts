import { Novel, ReaderSettings, CloudflareConfig } from '../types';

const DB_NAME = 'novel_reader_db';
const DB_VERSION = 2;
const STORE_NOVELS = 'novels';
const STORE_SETTINGS = 'settings';

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: 'literata',
  textAlign: 'left',
  contentWidth: 'medium',
  theme: 'light',
  customBg: '#1e2229',
  customFg: '#d8dee9',
  autoScroll: false,
  autoScrollSpeed: 3,
  showProgressBar: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  speechVoiceName: '',
  keepAwake: true
};

export const DEFAULT_CF_CONFIG: CloudflareConfig = {
  syncEnabled: false,
  accountId: '',
  d1DatabaseId: 'novel-library-d1',
  kvNamespaceId: 'novel-cache-kv',
  r2BucketName: 'novel-storage-r2',
  apiEndpoint: '',
  apiKey: ''
};

// Open IndexedDB instance safely
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB không được hỗ trợ trên trình duyệt này'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NOVELS)) {
        db.createObjectStore(STORE_NOVELS, { keyPath: 'id' });
      } else {
        // v2: wipe legacy store (removes built-in sample novels)
        const tx = (request as any).transaction as IDBTransaction;
        tx.objectStore(STORE_NOVELS).clear();
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all novels
export async function getAllNovels(): Promise<Novel[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NOVELS, 'readonly');
      const store = tx.objectStore(STORE_NOVELS);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = ((req.result as Novel[]) || []).filter(n => !n.id.startsWith('sample-'));
        resolve(results);
      };
      req.onerror = () => {
        resolve(loadFromLocalStorageFallback());
      };
    });
  } catch (e) {
    console.warn('Fallback to LocalStorage for novels', e);
    return loadFromLocalStorageFallback();
  }
}

// Fallback to localStorage
function loadFromLocalStorageFallback(): Novel[] {
  try {
    const stored = localStorage.getItem('novel_reader_novels');
    if (stored) {
      const parsed = JSON.parse(stored) as Novel[];
      return Array.isArray(parsed) ? parsed.filter(n => !n.id.startsWith('sample-')) : [];
    }
  } catch (e) {
    console.error(e);
  }
  return [] as Novel[];
}

// Save or update a novel
export async function saveNovel(novel: Novel): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NOVELS, 'readwrite');
      const store = tx.objectStore(STORE_NOVELS);
      const req = store.put(novel);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    const list = loadFromLocalStorageFallback();
    const idx = list.findIndex(n => n.id === novel.id);
    if (idx >= 0) {
      list[idx] = novel;
    } else {
      list.unshift(novel);
    }
    localStorage.setItem('novel_reader_novels', JSON.stringify(list));
  }
}

// Delete a novel
export async function deleteNovel(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NOVELS, 'readwrite');
      const store = tx.objectStore(STORE_NOVELS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    const list = loadFromLocalStorageFallback().filter(n => n.id !== id);
    localStorage.setItem('novel_reader_novels', JSON.stringify(list));
  }
}

// Load Reader Settings
export function getReaderSettings(): ReaderSettings {
  try {
    const stored = localStorage.getItem('novel_reader_settings');
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

// Save Reader Settings
export function saveReaderSettings(settings: ReaderSettings): void {
  try {
    localStorage.setItem('novel_reader_settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('Could not save settings to localStorage', e);
  }
}

// Load Cloudflare Config
export function getCloudflareConfig(): CloudflareConfig {
  try {
    const stored = localStorage.getItem('novel_reader_cf_config');
    if (stored) {
      return { ...DEFAULT_CF_CONFIG, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_CF_CONFIG;
}

// Save Cloudflare Config
export function saveCloudflareConfig(config: CloudflareConfig): void {
  try {
    localStorage.setItem('novel_reader_cf_config', JSON.stringify(config));
  } catch (e) {
    console.warn('Could not save CF config', e);
  }
}

// Export library backup as JSON
export function exportLibraryJson(novels: Novel[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(novels, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `thu_vien_truyen_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
