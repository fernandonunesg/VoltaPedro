import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePgLite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";

// Aceita DATABASE_URL ou POSTGRES_URL (esta última é injetada por integrações do Vercel/Neon).
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaDb?: any;
  __arenaPglite?: PGlite;
  __arenaSchemaReady?: Promise<void>;
};

// DDL idempotente: cria as tabelas na primeira conexão (dev local e produção).
const SCHEMA_DDL = `
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

  ALTER TABLE events ADD COLUMN IF NOT EXISTS actual_slot_minutes INTEGER;
`;

function getPglite() {
  if (!globalForDb.__arenaPglite) {
    globalForDb.__arenaPglite = new PGlite();
  }
  return globalForDb.__arenaPglite;
}

function getPool(url: string) {
  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    globalForDb.__arenaNextJsPostgresqlPool = new Pool({
      connectionString: url,
      ssl:
        url.includes("sslmode=require") || process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }
  return globalForDb.__arenaNextJsPostgresqlPool;
}

function createDb() {
  if (databaseUrl) {
    return drizzlePg(getPool(databaseUrl));
  }
  return drizzlePgLite(getPglite());
}

export const pool = globalForDb.__arenaNextJsPostgresqlPool;

export const db = (globalForDb.__arenaDb ?? createDb()) as ReturnType<typeof drizzlePg>;

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaDb = db;
}

// Garante que as tabelas existam antes de qualquer query. Roda uma única vez por processo.
export function ensureSchema(): Promise<void> {
  if (!globalForDb.__arenaSchemaReady) {
    const run = databaseUrl
      ? getPool(databaseUrl).query(SCHEMA_DDL).then(() => undefined)
      : getPglite().exec(SCHEMA_DDL).then(() => undefined);

    globalForDb.__arenaSchemaReady = run.catch((err) => {
      // Permite nova tentativa caso a primeira conexão falhe.
      globalForDb.__arenaSchemaReady = undefined;
      console.error("Erro ao garantir o schema do banco:", err);
      throw err;
    });
  }

  return globalForDb.__arenaSchemaReady;
}
