import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/db";
import { events, votes } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { SLOTS, NO_SHOW_MINUTES, STEP_MINUTES, clampDelay } from "@/lib/slots";

import { cleanText } from "@/lib/sanitize";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    await ensureSchema();
    const { slug } = await ctx.params;
    const body = await req.json();
    const voterName = cleanText(body.voterName, 40);
    const voterToken = cleanText(body.voterToken, 64);

    if (!voterName || voterName.length < 2) {
      return NextResponse.json({ error: "Coloca seu nome aí (entre 2 e 40 caracteres) pra gente saber quem apostou!" }, { status: 400 });
    }
    if (!voterToken || voterToken.length < 6) {
      return NextResponse.json({ error: "Token inválido. Recarrega a página e tenta de novo." }, { status: 400 });
    }

    // Aposta por tempo livre: minutos (0..480, passo 5) ou 999 = não vem.
    // Aceita slotIndex antigo por compatibilidade.
    const rawMinutes = body.slotMinutes != null
      ? Number(body.slotMinutes)
      : body.slotIndex != null
        ? (SLOTS.find((s) => s.slotIndex === Number(body.slotIndex))?.slotMinutes ?? NaN)
        : NaN;
    if (!Number.isFinite(rawMinutes)) return NextResponse.json({ error: "Horário inválido." }, { status: 400 });
    const minutes = rawMinutes >= NO_SHOW_MINUTES ? NO_SHOW_MINUTES : clampDelay(Math.round(rawMinutes / STEP_MINUTES) * STEP_MINUTES);
    const slotIndex = minutes >= NO_SHOW_MINUTES ? 9 : Math.min(16, Math.round(minutes / 30));

    const [ev] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!ev) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    if (ev.status !== "open") return NextResponse.json({ error: "A votação já fechou! O Pedro (talvez) já chegou." }, { status: 403 });

    const [existing] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.eventId, ev.id), eq(votes.voterToken, voterToken)))
      .limit(1);

    // Aposta é definitiva: quem já apostou não troca mais.
    if (existing) {
      return NextResponse.json(
        { error: "Você já apostou — e aposta é aposta. Sem trocas dessa vez, igual o Pedro: apareceu uma vez e sumiu." },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(votes)
      .values({ eventId: ev.id, voterName, voterToken, slotIndex, slotMinutes: minutes })
      .returning();
    const vote = created;

    const [countRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(votes)
      .where(eq(votes.eventId, ev.id));

    return NextResponse.json({ vote, isUpdate: false, totalVotes: countRow?.c ?? 0 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao votar" }, { status: 500 });
  }
}
