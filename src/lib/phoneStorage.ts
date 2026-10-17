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

export function normalizeToTenDigits(phone: string): string {
  let digits = phone.replace(/[^0-9]/g, "");
  if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length > 10 && digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }
  return digits.slice(0, 10);
}

/**
 * Saves or updates a phone number.
 */
export async function savePhoneNumber(phone: string, name?: string): Promise<void> {
  const cleanPhone = normalizeToTenDigits(phone);
  if (!cleanPhone || cleanPhone.length !== 10) return;

  try {
    const db = await getPhoneDB();
    await db.put(STORE_NAME, {
      phone: cleanPhone,
      name: name || undefined,
      lastUsed: Date.now(),
    });
  } catch (err) {
    console.warn("Could not save phone number:", err);
  }
}

/**
 * Retrieves all saved phone numbers sorted by most recently used.
 */
export async function getRecentPhoneNumbers(): Promise<SavedContact[]> {
  try {
    const db = await getPhoneDB();
    const all = await db.getAll(STORE_NAME);
    return all
      .map((c) => ({
        ...c,
        phone: normalizeToTenDigits(c.phone) || c.phone,
      }))
      .sort((a, b) => b.lastUsed - a.lastUsed);
  } catch (err) {
    console.warn("Could not retrieve phone numbers:", err);
    return [];
  }
}

/**
 * Deletes a phone number.
 */
export async function deletePhoneNumber(phone: string): Promise<void> {
  try {
    const db = await getPhoneDB();
    const cleanPhone = normalizeToTenDigits(phone);
    await db.delete(STORE_NAME, cleanPhone);
    if (cleanPhone !== phone) {
      await db.delete(STORE_NAME, phone);
    }
  } catch (err) {
    console.warn("Could not delete phone number:", err);
  }
}
