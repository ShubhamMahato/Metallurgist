import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "MetallurgistShopDB";
const STORE_NAME = "shopProfile";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getShopDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

const LOCAL_STORAGE_FALLBACK_KEY = "metallurgist_shop_name";

/**
 * Retrieves the saved shop / lab name from IndexedDB (with localStorage cache fallback).
 */
export async function getShopName(): Promise<string> {
  try {
    const db = await getShopDB();
    const stored = await db.get(STORE_NAME, "shopName");
    if (typeof stored === "string" && stored.trim()) {
      try {
        localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, stored.trim());
      } catch {}
      return stored.trim();
    }
  } catch (err) {
    console.warn("Could not retrieve shop name from IndexedDB:", err);
  }

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
    if (cached) return cached;
  } catch {}

  return "";
}

/**
 * Saves the shop / lab name into IndexedDB.
 */
export async function saveShopName(name: string): Promise<void> {
  const cleanName = name.trim();
  try {
    const db = await getShopDB();
    await db.put(STORE_NAME, cleanName, "shopName");
    try {
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, cleanName);
    } catch {}
    // Dispatch a window event so all components update in real-time
    window.dispatchEvent(new CustomEvent("shopNameChanged", { detail: cleanName }));
  } catch (err) {
    console.warn("Could not save shop name to IndexedDB:", err);
    try {
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, cleanName);
      window.dispatchEvent(new CustomEvent("shopNameChanged", { detail: cleanName }));
    } catch {}
  }
}
