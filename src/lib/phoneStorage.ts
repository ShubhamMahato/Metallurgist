import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "MetallurgistPhoneDB";
const STORE_NAME = "phoneNumbers";
const DB_VERSION = 1;

export interface SavedContact {
  phone: string;
  name?: string;
  lastUsed: number;
}

export async function getPhoneDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "phone" });
        store.createIndex("by_lastUsed", "lastUsed");
      }
    },
  });
}

/**
 * Saves or updates a phone number in IndexedDB.
 */
export async function savePhoneNumber(phone: string, name?: string): Promise<void> {
  const cleanPhone = phone.trim();
  if (!cleanPhone || cleanPhone.replace(/[^0-9]/g, "").length < 6) return;

  try {
    const db = await getPhoneDB();
    await db.put(STORE_NAME, {
      phone: cleanPhone,
      name: name || undefined,
      lastUsed: Date.now(),
    });
  } catch (err) {
    console.warn("Could not save phone number to IndexedDB:", err);
  }
}

/**
 * Retrieves all saved phone numbers sorted by most recently used.
 */
export async function getRecentPhoneNumbers(): Promise<SavedContact[]> {
  try {
    const db = await getPhoneDB();
    const all = await db.getAll(STORE_NAME);
    return all.sort((a, b) => b.lastUsed - a.lastUsed);
  } catch (err) {
    console.warn("Could not retrieve phone numbers from IndexedDB:", err);
    return [];
  }
}

/**
 * Deletes a phone number from IndexedDB.
 */
export async function deletePhoneNumber(phone: string): Promise<void> {
  try {
    const db = await getPhoneDB();
    await db.delete(STORE_NAME, phone);
  } catch (err) {
    console.warn("Could not delete phone number from IndexedDB:", err);
  }
}
