import "server-only";
import Database from "better-sqlite3";
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
  price_pack_cents INTEGER,
  cover_photo_id INTEGER,
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS photo_bibs (
  photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  bib TEXT NOT NULL,
  PRIMARY KEY (photo_id, bib)
);
CREATE INDEX IF NOT EXISTS photo_bibs_bib ON photo_bibs(bib);

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
  kind TEXT NOT NULL CHECK (kind IN ('photo', 'pack')),
  photo_id INTEGER REFERENCES photos(id) ON DELETE SET NULL,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  price_cents INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS order_items_order ON order_items(order_id);
`;

const globalForDb = globalThis as unknown as { __galeriaDb?: Database.Database };

function open(): Database.Database {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const db = new Database(path.join(config.dataDir, "galeria.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);
  return db;
}

export function db(): Database.Database {
  if (!globalForDb.__galeriaDb) globalForDb.__galeriaDb = open();
  return globalForDb.__galeriaDb;
}
