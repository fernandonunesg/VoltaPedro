import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePgLite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import path from "path";
import fs from "fs";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaDb?: any;
  __arenaPglite?: PGlite;
  __arenaPgliteInit?: Promise<void>;
};

function initPgliteDb() {
  if (globalForDb.__arenaDb) {
    return globalForDb.__arenaDb;
  }

  const pglite = globalForDb.__arenaPglite ?? new PGlite();
  globalForDb.__arenaPglite = pglite;

  if (!globalForDb.__arenaPgliteInit) {
    globalForDb.__arenaPgliteInit = pglite.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        event_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        location TEXT NOT NULL DEFAULT '',
        organizer_name TEXT NOT NULL DEFAULT 'Anônimo',
        organizer_token TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        actual_slot_index INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        voter_name TEXT NOT NULL,
        voter_token TEXT NOT NULL,
        slot_index INTEGER NOT NULL,
        slot_minutes INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS votes_event_token_unique ON votes(event_id, voter_token);
    `).then(() => {
      console.log("Banco de dados local PGlite pronto para testes.");
    }).catch((err) => {
      console.error("Erro ao inicializar tabelas PGlite locais:", err);
    });
  }

  const dbInstance = drizzlePgLite(pglite);
  globalForDb.__arenaDb = dbInstance;
  return dbInstance;
}

function initPgPoolDb(url: string) {
  const pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: url,
      ssl:
        url.includes("sslmode=require") || process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }

  return drizzlePg(pool);
}

export const pool = globalForDb.__arenaNextJsPostgresqlPool;

export const db = (globalForDb.__arenaDb ?? (databaseUrl ? initPgPoolDb(databaseUrl) : initPgliteDb())) as ReturnType<typeof drizzlePg>;

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaDb = db;
}
