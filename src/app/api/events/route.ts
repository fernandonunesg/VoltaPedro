import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, votes } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import crypto from "crypto";

function makeSlug() {
  return crypto.randomBytes(4).toString("hex"); // 8 chars
}

export async function GET() {
  try {
    const rows = await db
      .select({
        id: events.id,
        slug: events.slug,
        name: events.name,
        description: events.description,
        eventDate: events.eventDate,
        startTime: events.startTime,
        location: events.location,
        organizerName: events.organizerName,
        status: events.status,
        actualSlotIndex: events.actualSlotIndex,
        createdAt: events.createdAt,
        voteCount: sql<number>`count(${votes.id})::int`,
      })
      .from(events)
      .leftJoin(votes, eq(votes.eventId, events.id))
      .groupBy(events.id)
      .orderBy(desc(events.createdAt))
      .limit(24);

    // global stats
    const [allVotes] = await db.select({ c: sql<number>`count(*)::int` }).from(votes);
    const [timed] = await db
      .select({ avg: sql<number>`coalesce(avg(case when ${votes.slotMinutes} < 999 then ${votes.slotMinutes} end),0)` })
      .from(votes);

    return NextResponse.json({
      events: rows,
      stats: {
        totalEvents: rows.length,
        totalVotes: allVotes?.c ?? 0,
        avgPredictedDelay: Math.round(Number(timed?.avg ?? 0)),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao listar eventos" }, { status: 500 });
  }
}

import { cleanText, isValidDate, isValidTime } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = cleanText(body.name, 80);
    const description = cleanText(body.description, 300);
    const eventDate = cleanText(body.eventDate, 10);
    const startTime = cleanText(body.startTime, 5);
    const location = cleanText(body.location, 100);
    const organizerName = cleanText(body.organizerName, 50) || "Anônimo";

    if (!name || name.length < 3) {
      return NextResponse.json({ error: "Dê um nome pro evento (entre 3 e 80 caracteres)." }, { status: 400 });
    }
    if (!isValidDate(eventDate)) {
      return NextResponse.json({ error: "Data inválida. Use o formato AAAA-MM-DD com uma data real." }, { status: 400 });
    }
    if (!isValidTime(startTime)) {
      return NextResponse.json({ error: "Horário inválido. Use um horário válido entre 00:00 e 23:59." }, { status: 400 });
    }

    // Gerar token seguro do organizador para autorizar alterações posteriores
    const organizerToken = crypto.randomBytes(16).toString("hex");

    // unique slug retry
    let slug = makeSlug();
    for (let i = 0; i < 5; i++) {
      const existing = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug)).limit(1);
      if (existing.length === 0) break;
      slug = makeSlug();
    }

    const [created] = await db
      .insert(events)
      .values({ slug, name, description, eventDate, startTime, location, organizerName, organizerToken })
      .returning();

    // Retorna o evento junto com o organizerToken para ser guardado no navegador do criador
    return NextResponse.json({ event: created, organizerToken }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao criar evento" }, { status: 500 });
  }
}
