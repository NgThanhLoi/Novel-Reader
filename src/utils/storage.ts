import { Novel, ReaderSettings, CloudflareConfig } from '../types';
import { SAMPLE_NOVELS } from '../data/sampleNovels';

const DB_NAME = 'novel_reader_db';
const DB_VERSION = 1;
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
  speechVoiceName: ''
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
        let results = req.result as Novel[];
        if (!results || results.length === 0) {
          // Initialize with sample novels if empty
          saveInitialSamples(SAMPLE_NOVELS);
          results = SAMPLE_NOVELS;
        }
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
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error(e);
  }
  return SAMPLE_NOVELS;
}

// Save initial sample books
async function saveInitialSamples(samples: Novel[]) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NOVELS, 'readwrite');
    const store = tx.objectStore(STORE_NOVELS);
    samples.forEach(s => store.put(s));
  } catch (e) {
    try {
      localStorage.setItem('novel_reader_novels', JSON.stringify(samples));
    } catch {}
  }
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
