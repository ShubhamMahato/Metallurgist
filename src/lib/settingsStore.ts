
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
