
import { openDB, IDBPDatabase } from 'idb';
import { Language } from './translations';

const DB_NAME = 'app-settings';
const STORE_NAME = 'settings';
const VERSION = 1;

interface SettingsDB {
  language: Language;
}

let dbPromise: Promise<IDBPDatabase<any>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
};

export const getLanguage = async (): Promise<Language> => {
  try {
    const db = await getDB();
    const lang = await db.get(STORE_NAME, 'language');
    return (lang as Language) || 'en';
  } catch (error) {
    console.error('Failed to get language from IDB:', error);
    return 'en';
  }
};

export const saveLanguage = async (language: Language): Promise<void> => {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, language, 'language');
  } catch (error) {
    console.error('Failed to save language to IDB:', error);
  }
};

export const getDecimalPrecision = async (): Promise<number> => {
  try {
    const db = await getDB();
    const prec = await db.get(STORE_NAME, 'decimalPrecision');
    return typeof prec === 'number' && (prec === 2 || prec === 3) ? prec : 2;
  } catch (error) {
    console.error('Failed to get decimalPrecision from IDB:', error);
    return 2;
  }
};

export const saveDecimalPrecision = async (precision: number): Promise<void> => {
  try {
    const val = precision === 2 ? 2 : 3;
    const db = await getDB();
    await db.put(STORE_NAME, val, 'decimalPrecision');
    window.dispatchEvent(new CustomEvent('decimalPrecisionChanged', { detail: val }));
  } catch (error) {
    console.error('Failed to save decimalPrecision to IDB:', error);
  }
};

export const getAutoBalance = async (): Promise<boolean> => {
  try {
    const db = await getDB();
    const auto = await db.get(STORE_NAME, 'autoBalance');
    return typeof auto === 'boolean' ? auto : true;
  } catch (error) {
    console.error('Failed to get autoBalance from IDB:', error);
    return true;
  }
};

export const saveAutoBalance = async (autoBalance: boolean): Promise<void> => {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, autoBalance, 'autoBalance');
    window.dispatchEvent(new CustomEvent('autoBalanceChanged', { detail: autoBalance }));
  } catch (error) {
    console.error('Failed to save autoBalance to IDB:', error);
  }
};
