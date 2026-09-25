// IndexedDB asynchronous storage engine with automatic localStorage fallback
// Bypasses 5MB browser quota for large GitHub repositories, code files, and agent chats

const DB_NAME = 'CodeSquadHubDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_keyval';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

export async function getDbItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result !== undefined) {
          resolve(request.result);
        } else {
          // Fallback check in localStorage for seamless migration
          try {
            const lsValue = localStorage.getItem(key);
            if (lsValue) {
              const parsed = JSON.parse(lsValue);
              resolve(parsed);
              // Migrate to IndexedDB
              setDbItem(key, parsed).catch(() => {});
              return;
            }
          } catch {}
          resolve(fallback);
        }
      };

      request.onerror = () => {
        resolve(fallback);
      };
    });
  } catch (e) {
    // If IndexedDB fails, use localStorage
    try {
      const lsValue = localStorage.getItem(key);
      if (lsValue) return JSON.parse(lsValue);
    } catch {}
    return fallback;
  }
}

export async function setDbItem<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e);
    });
  } catch (e) {
    // Fallback to localStorage if IndexedDB is unavailable
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (lsErr) {
      console.warn('Storage write failed', lsErr);
    }
  }
}
