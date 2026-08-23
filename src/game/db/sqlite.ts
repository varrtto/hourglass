import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import {
  BUILTIN_LEVEL_ID,
  DEFAULT_CAMPAIGN_ID,
  nowIso,
} from "./types";

const IDB_NAME = "hourglass-db";
const IDB_STORE = "sqlite";
const IDB_KEY = "main";

let sqlPromise: Promise<SqlJsStatic> | null = null;
let dbPromise: Promise<Database> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function loadSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: () => "/sql-wasm.wasm",
    });
  }
  return sqlPromise;
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function readPersistedBytes(): Promise<Uint8Array | null> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(IDB_KEY);
    req.onsuccess = () => {
      const value = req.result;
      if (!value) {
        resolve(null);
        return;
      }
      if (value instanceof Uint8Array) {
        resolve(value);
        return;
      }
      if (value instanceof ArrayBuffer) {
        resolve(new Uint8Array(value));
        return;
      }
      resolve(null);
    };
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
}

async function writePersistedBytes(bytes: Uint8Array): Promise<void> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    // Copy into a plain ArrayBuffer-backed view for IDB compatibility.
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    store.put(copy, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
  });
}

function migrateSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS levels (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      builtin INTEGER NOT NULL DEFAULT 0
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS campaign_levels (
      campaign_id TEXT NOT NULL,
      level_id TEXT NOT NULL,
      sort_index INTEGER NOT NULL,
      PRIMARY KEY (campaign_id, level_id)
    );
  `);
}

function seedDefaultCampaign(db: Database) {
  const existing = queryOne<{ id: string }>(
    db,
    "SELECT id FROM campaigns WHERE id = ?",
    [DEFAULT_CAMPAIGN_ID],
  );
  if (existing) return;

  const ts = nowIso();
  db.run(
    "INSERT INTO campaigns (id, title, updated_at, builtin) VALUES (?, ?, ?, 1)",
    [DEFAULT_CAMPAIGN_ID, "Orpheus' Descent", ts],
  );
  db.run(
    "INSERT INTO campaign_levels (campaign_id, level_id, sort_index) VALUES (?, ?, 0)",
    [DEFAULT_CAMPAIGN_ID, BUILTIN_LEVEL_ID],
  );
}

export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await loadSql();
      const bytes = await readPersistedBytes();
      const db = bytes ? new SQL.Database(bytes) : new SQL.Database();
      migrateSchema(db);
      seedDefaultCampaign(db);
      await persistDb(db);
      return db;
    })();
  }
  return dbPromise;
}

export async function persistDb(db?: Database): Promise<void> {
  const database = db ?? (await getDb());
  const data = database.export();
  await writePersistedBytes(data);
}

/** Debounced persist for rapid edits; call `persistDb` after explicit Saves. */
export function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistDb();
  }, 250);
}

export function queryAll<T extends Record<string, unknown>>(
  db: Database,
  sql: string,
  params: unknown[] = [],
): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params as never[]);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T extends Record<string, unknown>>(
  db: Database,
  sql: string,
  params: unknown[] = [],
): T | null {
  const rows = queryAll<T>(db, sql, params);
  return rows[0] ?? null;
}
