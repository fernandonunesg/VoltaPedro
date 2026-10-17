import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, votes } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { SLOTS } from "@/lib/slots";

import { cleanText } from "@/lib/sanitize";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const body = await req.json();
    const voterName = cleanText(body.voterName, 40);
    const voterToken = cleanText(body.voterToken, 64);
    const slotIndex = Number(body.slotIndex);

    if (!voterName || voterName.length < 2) {
      return NextResponse.json({ error: "Coloca seu nome aí (entre 2 e 40 caracteres) pra gente saber quem apostou!" }, { status: 400 });
    }
    if (!voterToken || voterToken.length < 6) {
      return NextResponse.json({ error: "Token inválido. Recarrega a página e tenta de novo." }, { status: 400 });
    }
    const slot = SLOTS.find((s) => s.slotIndex === slotIndex);
    if (!slot) return NextResponse.json({ error: "Horário inválido." }, { status: 400 });

    const [ev] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!ev) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    if (ev.status !== "open") return NextResponse.json({ error: "A votação já fechou! O Pedro (talvez) já chegou." }, { status: 403 });

    const [existing] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.eventId, ev.id), eq(votes.voterToken, voterToken)))
      .limit(1);

    let vote;
    let changed = false;
    if (existing) {
      changed = existing.slotIndex !== slotIndex;
      const [updated] = await db
        .update(votes)
        .set({ voterName, slotIndex: slot.slotIndex, slotMinutes: slot.slotMinutes, updatedAt: new Date() })
        .where(eq(votes.id, existing.id))
        .returning();
      vote = updated;
    } else {
      const [created] = await db
        .insert(votes)
        .values({ eventId: ev.id, voterName, voterToken, slotIndex: slot.slotIndex, slotMinutes: slot.slotMinutes })
        .returning();
      vote = created;
    }

    const [countRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(votes)
      .where(eq(votes.eventId, ev.id));

    return NextResponse.json({ vote, changed, isUpdate: !!existing, totalVotes: countRow?.c ?? 0 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao votar" }, { status: 500 });
  }
}
