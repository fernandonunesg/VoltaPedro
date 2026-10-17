import { db, ensureSchema } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasDbUrl = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  try {
    await ensureSchema();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: hasDbUrl ? "postgres" : "pglite" });
  } catch (e) {
    return Response.json(
      { ok: false, db: hasDbUrl ? "postgres" : "pglite", error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
