import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/db";
import { events, votes } from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { SLOTS } from "@/lib/slots";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    await ensureSchema();
    const { slug } = await ctx.params;
    const [ev] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!ev) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

    // Verifica se quem está acessando é o organizador sem expor o token publicamente
    const clientToken = req.headers.get("x-organizer-token");
    const isOrganizer = Boolean(ev.organizerToken && clientToken && ev.organizerToken === clientToken);

    // Remove organizerToken do objeto retornado ao público
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { organizerToken, ...safeEvent } = ev;

    const allVotes = await db.select().from(votes).where(eq(votes.eventId, ev.id)).orderBy(asc(votes.createdAt));

    const distribution = SLOTS.map((s) => {
      const count = allVotes.filter((v) => v.slotIndex === s.slotIndex).length;
      return { ...s, count, pct: allVotes.length ? Math.round((count / allVotes.length) * 100) : 0 };
    });

    const timed = allVotes.filter((v) => v.slotMinutes < 999);
    const avg = timed.length ? Math.round(timed.reduce((a, v) => a + v.slotMinutes, 0) / timed.length) : 0;
    const noShow = allVotes.filter((v) => v.slotIndex === 9).length;

    // winners if revealed (público: aparece pra todos quando o resultado é revelado)
    let winners: typeof allVotes = [];
    if (ev.actualSlotIndex !== null && ev.actualSlotIndex !== undefined) {
      winners = allVotes.filter((v) => v.slotIndex === ev.actualSlotIndex);
    }

    // Voto de quem está pedindo (identificado pelo token do apostador enviado no header).
    const voterToken = req.headers.get("x-voter-token");
    const mine = voterToken ? allVotes.find((v) => v.voterToken === voterToken) : undefined;

    return NextResponse.json({
      event: safeEvent,
      isOrganizer,
      totalVotes: allVotes.length,
      avgPredictedDelay: avg,
      noShowCount: noShow,
      myVote: mine
        ? { id: mine.id, voterName: mine.voterName, slotIndex: mine.slotIndex, slotMinutes: mine.slotMinutes }
        : null,
      winners: winners.map((w) => ({ id: w.id, voterName: w.voterName, slotIndex: w.slotIndex })),
      // Lista individual + distribuição por horário: só para o organizador.
      votes: isOrganizer
        ? allVotes.map((v) => ({
            id: v.id,
            voterName: v.voterName,
            voterToken: v.voterToken,
            slotIndex: v.slotIndex,
            slotMinutes: v.slotMinutes,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt,
          }))
        : [],
      distribution: isOrganizer ? distribution : [],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao buscar evento" }, { status: 500 });
  }
}

// PATCH: reveal actual arrival / reopen (apenas com autorização do organizador)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    await ensureSchema();
    const { slug } = await ctx.params;
    const body = await req.json();
    const [ev] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!ev) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

    // Validação de segurança: apenas quem possui o token do organizador pode alterar o status
    const clientToken = req.headers.get("x-organizer-token") || body.organizerToken;
    if (ev.organizerToken && ev.organizerToken !== clientToken) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas o organizador deste bolão pode fechar a votação ou revelar o resultado." },
        { status: 403 }
      );
    }

    const updates: Partial<{ status: string; actualSlotIndex: number | null }> = {};
    if (body.action === "reveal") {
      const idx = Number(body.actualSlotIndex);
      if (!SLOTS.some((s) => s.slotIndex === idx)) return NextResponse.json({ error: "Horário real inválido" }, { status: 400 });
      updates.actualSlotIndex = idx;
      updates.status = "closed";
    } else if (body.action === "reopen") {
      updates.actualSlotIndex = null;
      updates.status = "open";
    } else if (body.action === "close") {
      updates.status = "closed";
    } else {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }

    const [updated] = await db.update(events).set(updates).where(eq(events.id, ev.id)).returning();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { organizerToken, ...safeUpdated } = updated;
    return NextResponse.json({ event: safeUpdated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao atualizar evento" }, { status: 500 });
  }
}
