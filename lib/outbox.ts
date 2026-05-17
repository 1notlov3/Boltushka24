"use client";

export type OutboxMessagePayload = {
  content: string;
  fileUrl?: string | null;
  parentMessageId?: string | null;
  parentDirectMessageId?: string | null;
};

export type OutboxMessage = {
  id: string;
  queryKey: string;
  apiUrl: string;
  query: Record<string, string>;
  payload: OutboxMessagePayload;
  createdAt: number;
};

const DB_NAME = "boltushka-outbox";
const STORE_NAME = "messages";
const DB_VERSION = 1;

function openOutboxDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return openOutboxDb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = callback(tx.objectStore(STORE_NAME));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  }));
}

export async function enqueueOutboxMessage(message: OutboxMessage) {
  await runStore("readwrite", (store) => store.put(message));
}

export async function removeOutboxMessage(id: string) {
  await runStore("readwrite", (store) => store.delete(id));
}

export async function listOutboxMessages() {
  return runStore<OutboxMessage[]>("readonly", (store) => store.getAll());
}
