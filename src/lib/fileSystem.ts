import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'MetallurgistFileDB';
const STORE_NAME = 'fileHandles';
const KEY_NAME = 'reportHandle';

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function saveFileHandle(handle: any) {
  const db = await getDB();
  await db.put(STORE_NAME, handle, KEY_NAME);
}

export async function getFileHandle(): Promise<any | null> {
  const db = await getDB();
  return db.get(STORE_NAME, KEY_NAME);
}

export async function verifyPermission(handle: any, readWrite = false) {
  const options = {
    mode: (readWrite ? 'readwrite' : 'read') as 'read' | 'readwrite',
  };
  
  // Check if permission was already granted. If so, return true.
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }
  
  // Request permission. If the user grants permission, return true.
  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }
  
  // The user didn't grant permission, so return false.
  return false;
}

export async function readFileContent(handle: any): Promise<string> {
  const file = await handle.getFile();
  return await file.text();
}

export async function clearFileHandle() {
  const db = await getDB();
  await db.delete(STORE_NAME, KEY_NAME);
}
