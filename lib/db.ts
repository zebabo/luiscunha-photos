import "server-only";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  event_date TEXT,
  location TEXT NOT NULL DEFAULT '',
  price_photo_cents INTEGER NOT NULL,
  price_car_pack_cents INTEGER,
  price_pack_cents INTEGER,
  cover_photo_id INTEGER,
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Carros/pilotos inscritos num evento
CREATE TABLE IF NOT EXISTS event_cars (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  driver TEXT NOT NULL DEFAULT '',
  team TEXT NOT NULL DEFAULT '',
  cover_photo_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (event_id, number)
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL UNIQUE,
  original_ext TEXT NOT NULL,
  original_name TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS photos_event ON photos(event_id);

-- Uma foto pode ter mais do que um carro (ex.: batalhas em tandem)
CREATE TABLE IF NOT EXISTS photo_cars (
  photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  car_id INTEGER NOT NULL REFERENCES event_cars(id) ON DELETE CASCADE,
  PRIMARY KEY (photo_id, car_id)
);
CREATE INDEX IF NOT EXISTS photo_cars_car ON photo_cars(car_id);

CREATE TABLE IF NOT EXISTS discount_codes (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  kind TEXT NOT NULL CHECK (kind IN ('percent', 'fixed')),
  value INTEGER NOT NULL,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  nif TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL DEFAULT 'pt',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  discount_code TEXT,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  download_token TEXT UNIQUE,
  download_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('photo', 'carpack', 'pack')),
  photo_id INTEGER REFERENCES photos(id) ON DELETE SET NULL,
  car_id INTEGER REFERENCES event_cars(id) ON DELETE SET NULL,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  price_cents INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS order_items_order ON order_items(order_id);

-- Conteúdo do site (editável no admin)
CREATE TABLE IF NOT EXISTS upcoming_events (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  date_label TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  image_key TEXT,
  link_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS portfolio (
  id INTEGER PRIMARY KEY,
  image_key TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

/**
 * Base de dados SQLite incluída no próprio Node.js (node:sqlite) — não precisa de compilação
 * nem de dependências nativas, funciona igual em Windows, macOS e Linux.
 */
export type Db = {
  prepare(sql: string): StatementSync;
  exec(sql: string): void;
  /** Devolve uma função que corre `fn` dentro de uma transação (tudo ou nada). */
  transaction<T>(fn: () => T): () => T;
};

const globalForDb = globalThis as unknown as { __galeriaDb?: Db };

function open(): Db {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const raw = new DatabaseSync(path.join(config.dataDir, "galeria.db"));
  raw.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  raw.exec(SCHEMA);
  return {
    prepare: (sql) => raw.prepare(sql),
    exec: (sql) => raw.exec(sql),
    transaction: (fn) => () => {
      raw.exec("BEGIN IMMEDIATE");
      try {
        const result = fn();
        raw.exec("COMMIT");
        return result;
      } catch (err) {
        raw.exec("ROLLBACK");
        throw err;
      }
    },
  };
}

export function db(): Db {
  if (!globalForDb.__galeriaDb) globalForDb.__galeriaDb = open();
  return globalForDb.__galeriaDb;
}
