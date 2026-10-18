"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlarmClock, ArrowLeft, Calendar, MapPin, Users, Copy, Check, Share2, Trophy,
  Clock, Timer, Crown, Ghost, Zap, RefreshCw, Eye, Sparkles, Hourglass,
  BadgeCheck, Lock, RotateCcw, PartyPopper, Flame, ChevronRight
} from "lucide-react";
import { SLOTS, addMinutesToTime, slotByIndex } from "@/lib/slots";

type Vote = { id: string; voterName: string; voterToken: string; slotIndex: number; slotMinutes: number; createdAt: string; updatedAt: string };
type Dist = (typeof SLOTS)[number] & { count: number; pct: number };
type EventData = {
  id: string; slug: string; name: string; description: string; eventDate: string;
  startTime: string; location: string; organizerName: string; status: string;
  actualSlotIndex: number | null; createdAt: string;
};

function getOrCreateToken() {
  if (typeof window === "undefined") return "";
  let t = localStorage.getItem("pedro_voter_token");
  if (!t) {
    t = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
    localStorage.setItem("pedro_voter_token", t);
  }
  return t;
}
function formatDateBR(iso: string) { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }
function fmtDelay(min: number) { if (min >= 999) return "não vem"; if (min === 0) return "no horário"; if (min < 60) return `+${min}min`; const h = Math.floor(min / 60); const m = min % 60; return m ? `+${h}h${String(m).padStart(2, "0")}` : `+${h}h`; }

export default function EventPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [event, setEvent] = useState<EventData | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [distribution, setDistribution] = useState<Dist[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [avgDelay, setAvgDelay] = useState(0);
  const [noShowCount, setNoShowCount] = useState(0);
  const [winners, setWinners] = useState<{ id: string; voterName: string; slotIndex: number }[]>([]);
  const [myVote, setMyVote] = useState<{ id: string; voterName: string; slotIndex: number; slotMinutes: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [voterName, setVoterName] = useState("");
  const [voterToken, setVoterToken] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteMsg, setVoteMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const [liveFlash, setLiveFlash] = useState(false);
  const prevTotal = useRef(0);

  const [revealSlot, setRevealSlot] = useState<number>(2);
  const [revealing, setRevealing] = useState(false);
  const [showOrganizer, setShowOrganizer] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [organizerToken, setOrganizerToken] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [tokenError, setTokenError] = useState("");

  useEffect(() => {
    setVoterToken(getOrCreateToken());
    const savedName = localStorage.getItem("pedro_voter_name") || "";
    if (savedName) setVoterName(savedName);
    const token = localStorage.getItem(`pedro_organizer_${slug}`) || "";
    if (token) setOrganizerToken(token);
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [slug]);

  const load = useCallback(async (silent = false) => {
    try {
      const token = localStorage.getItem(`pedro_organizer_${slug}`) || organizerToken;
      const voterTok = getOrCreateToken();
      const res = await fetch(`/api/events/${slug}`, {
        cache: "no-store",
        headers: {
          ...(token ? { "x-organizer-token": token } : {}),
          ...(voterTok ? { "x-voter-token": voterTok } : {}),
        },
      });
      if (res.status === 404) { setNotFound(true); return; }
      const data = await res.json();
      if (data.totalVotes !== prevTotal.current && prevTotal.current !== 0) {
        setLiveFlash(true); setTimeout(() => setLiveFlash(false), 1200);
      }
      prevTotal.current = data.totalVotes;
      setEvent(data.event); setVotes(data.votes); setDistribution(data.distribution);
      setTotalVotes(data.totalVotes); setAvgDelay(data.avgPredictedDelay);
      setNoShowCount(data.noShowCount); setWinners(data.winners || []);
      setIsOrganizer(Boolean(data.isOrganizer));
      setMyVote(data.myVote ?? null);
      // restore my vote selection
      const mine = data.myVote;
      if (mine && !silent) setSelected(mine.slotIndex);
      else if (mine) setSelected((cur) => cur ?? mine.slotIndex);
    } catch { /* retry */ } finally { setLoading(false); }
  }, [slug, organizerToken]);

  useEffect(() => { load(); const t = setInterval(() => load(true), 4000); return () => clearInterval(t); }, [load]);

  const handleUnlockOrganizer = () => {
    const trimmed = inputToken.trim();
    if (!trimmed) {
      setTokenError("Digite ou cole o token do organizador.");
      return;
    }
    localStorage.setItem(`pedro_organizer_${slug}`, trimmed);
    setOrganizerToken(trimmed);
    setTokenError("");
    load(false);
  };

  const isOpen = event?.status === "open";
  const isRevealed = event?.actualSlotIndex !== null && event?.actualSlotIndex !== undefined;

  const eventDateTime = useMemo(() => {
    if (!event) return null;
    const [y, m, d] = event.eventDate.split("-").map(Number);
    const [hh, mm] = event.startTime.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm, 0);
  }, [event]);

  const countdown = useMemo(() => {
    if (!eventDateTime) return null;
    const diff = eventDateTime.getTime() - nowTick;
    if (diff <= 0) {
      const lateMin = Math.floor(-diff / 60000);
      return { past: true, text: lateMin < 60 ? `Já era pra ter começado há ${lateMin} min` : `Já era pra ter começado há ${Math.floor(lateMin / 60)}h${String(lateMin % 60).padStart(2, "0")}`, lateMin };
    }
    const totalSec = Math.floor(diff / 1000);
    const days = Math.floor(totalSec / 86400);
    const hrs = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return { past: false, text: days > 0 ? `Começa em ${days}d ${hrs}h ${mins}min` : `Começa em ${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`, lateMin: 0 };
  }, [eventDateTime, nowTick]);

  const topSlot = useMemo(() => {
    if (!distribution.length || totalVotes === 0) return null;
    return [...distribution].sort((a, b) => b.count - a.count)[0];
  }, [distribution, totalVotes]);

  const lateMeterPct = useMemo(() => {
    if (!totalVotes) return 8;
    // 0 min -> 5%, 240 -> 90%, no-show pushes up
    const base = Math.min(92, 5 + (avgDelay / 240) * 80 + (noShowCount / Math.max(1, totalVotes)) * 20);
    return Math.round(base);
  }, [avgDelay, noShowCount, totalVotes]);
  const lateMeterLabel = lateMeterPct < 25 ? "OTIMISTA (INGÊNUO)" : lateMeterPct < 45 ? "ATRASINHO LEVE" : lateMeterPct < 65 ? "CLÁSSICO PEDRO" : lateMeterPct < 82 ? "MODO LENDA" : "ARQUIVO X / FANTASMA";

  async function handleVote() {
    if (selected === null) { setVoteMsg({ type: "err", text: "Escolhe um horário primeiro! Clica num cartão aí embaixo." }); return; }
    if (!voterName.trim() || voterName.trim().length < 2) { setVoteMsg({ type: "err", text: "Coloca seu nome pra aposta valer — senão como a gente zoa depois?" }); document.getElementById("voter-name")?.focus(); return; }
    setVoting(true); setVoteMsg(null);
    try {
      localStorage.setItem("pedro_voter_name", voterName.trim());
      const res = await fetch(`/api/events/${slug}/vote`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterName: voterName.trim(), voterToken, slotIndex: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao votar");
      setJustVoted(true); setTimeout(() => setJustVoted(false), 2600);
      setVoteMsg({ type: "ok", text: data.isUpdate ? `Voto atualizado! Agora você está em ${slotByIndex(selected).label}. Pedro aprovaria essa indecisão.` : `Aposta registrada! Você cravou ${slotByIndex(selected).label}. Boa sorte — você vai precisar.` });
      await load(true);
    } catch (err) {
      setVoteMsg({ type: "err", text: err instanceof Error ? err.message : "Erro ao votar" });
    } finally { setVoting(false); }
  }

  async function organizerAction(action: "reveal" | "reopen" | "close") {
    setRevealing(true);
    try {
      const token = organizerToken || localStorage.getItem(`pedro_organizer_${slug}`) || "";
      const res = await fetch(`/api/events/${slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-organizer-token": token,
        },
        body: JSON.stringify(action === "reveal" ? { action, actualSlotIndex: revealSlot, organizerToken: token } : { action, organizerToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      await load(true);
    } catch (e) { alert(e instanceof Error ? e.message : "Erro"); } finally { setRevealing(false); }
  }

  const shareLink = typeof window !== "undefined" ? `${window.location.origin}/evento/${slug}` : `/evento/${slug}`;

  async function copyLink() {
    try { await navigator.clipboard.writeText(shareLink); } catch {
      const ta = document.createElement("textarea"); ta.value = shareLink; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-amber-50 px-4">
        <div className="text-center">
          <AlarmClock className="mx-auto h-12 w-12 animate-bounce text-stone-900" />
          <p className="font-display mt-4 text-xl font-black">Procurando o Pedro…</p>
          <p className="text-sm text-stone-500">Ele disse que já estava chegando. A gente acredita quando vê.</p>
        </div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="grid min-h-screen place-items-center bg-amber-50 px-4">
        <div className="w-full max-w-md rounded-3xl border-2 border-stone-900 bg-white p-8 text-center hard-shadow">
          <Ghost className="mx-auto h-12 w-12 text-stone-400" />
          <h1 className="font-display mt-4 text-2xl font-black">Esse bolão sumiu igual ao Pedro</h1>
          <p className="mt-2 text-sm text-stone-600">Link inválido ou evento removido. Confere o link ou cria um bolão novo.</p>
          <Link href="/" className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-stone-900 bg-amber-400 px-4 py-2.5 text-sm font-black hard-shadow-sm"><ArrowLeft className="h-4 w-4" /> Voltar e criar evento</Link>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="sticky top-0 z-40 border-b-2 border-stone-900 bg-amber-400">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-stone-900 bg-white hard-shadow-sm"><AlarmClock className="h-5 w-5" /></span>
            <span className="font-display leading-none"><span className="block text-[15px] font-black sm:text-lg">PEDRO DIAS</span><span className="block text-[10px] font-bold tracking-[0.18em] text-stone-700">VAI CHEGAR QUANDO?</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <span className={`hidden items-center gap-1.5 rounded-full border-2 border-stone-900 px-3 py-1.5 text-xs font-black sm:inline-flex ${liveFlash ? "bg-emerald-400" : "bg-white"}`}>
              <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-emerald-600" : "bg-red-500"}`} /> {isOpen ? "AO VIVO" : "FECHADO"} • {totalVotes} votos
            </span>
            <Link href="/#criar" className="rounded-full border-2 border-stone-900 bg-stone-900 px-3 py-2 text-xs font-black text-white hard-shadow-sm sm:text-sm">+ Novo bolão</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
        <Link href="/#eventos" className="inline-flex items-center gap-1 text-sm font-bold text-stone-600 hover:text-stone-900"><ArrowLeft className="h-4 w-4" /> Todos os bolões</Link>

        {/* EVENT HERO */}
        <section className="mt-4 overflow-hidden rounded-3xl border-2 border-stone-900 bg-white hard-shadow">
          <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
            <div className="min-w-0 p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-[11px] font-black tracking-wide ${isRevealed ? "bg-stone-900 text-amber-300" : isOpen ? "bg-emerald-400 text-stone-900" : "bg-red-500 text-white"}`}>
                  {isRevealed ? "RESULTADO REVELADO" : isOpen ? "VOTAÇÃO ABERTA" : "VOTAÇÃO FECHADA"}
                </span>
                <span className="rounded-full border-2 border-stone-900 bg-amber-100 px-3 py-1 text-[11px] font-black">INÍCIO OFICIAL {event.startTime}</span>
                {countdown && <span className={`rounded-full px-3 py-1 text-[11px] font-black ${countdown.past ? "bg-red-100 text-red-700" : "bg-stone-900 text-white"}`}><Timer className="mr-1 inline h-3.5 w-3.5" />{countdown.text}</span>}
              </div>
              <h1 className="font-display mt-4 text-3xl font-black leading-[1.02] tracking-tight sm:text-5xl">{event.name}</h1>
              {event.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">{event.description}</p>}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-semibold text-stone-700">
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {formatDateBR(event.eventDate)} às {event.startTime}</span>
                {event.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {event.location}</span>}
                <span className="flex items-center gap-1.5"><Crown className="h-4 w-4" /> Organizado por {event.organizerName}</span>
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {totalVotes} participante{totalVotes === 1 ? "" : "s"}</span>
              </div>

              {/* share */}
              <div className="mt-6 min-w-0 rounded-2xl border-2 border-stone-900 bg-amber-50 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-black tracking-wide text-stone-700"><Share2 className="h-4 w-4" /> MANDA ESSE LINK PRA GALERA APOSTAR</p>
                <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row">
                  <code className="flex-1 truncate rounded-xl border-2 border-stone-900 bg-white px-3 py-2.5 text-xs font-bold sm:text-sm">{shareLink}</code>
                  <button onClick={copyLink} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-stone-900 bg-stone-900 px-4 py-2.5 text-xs font-black text-white">
                    {copied ? <><Check className="h-4 w-4" /> COPIADO!</> : <><Copy className="h-4 w-4" /> COPIAR LINK</>}
                  </button>
                  <a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Bora apostar: que horas o Pedro chega no "${event.name}"? ${shareLink}`)}`} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-stone-900 bg-[#25D366] px-4 py-2.5 text-xs font-black text-stone-900">WhatsApp</a>
                </div>
              </div>
            </div>

            {/* LATE-O-METER */}
            <div className="min-w-0 border-t-2 border-stone-900 bg-stone-900 p-5 text-white sm:p-7 lg:border-l-2 lg:border-t-0">
              <p className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.16em] text-amber-300"><Hourglass className="h-4 w-4" /> PEDRO LATE-O-METER™</p>
              <p className="font-display mt-3 text-4xl font-black">{totalVotes ? fmtDelay(avgDelay) : "—"}</p>
              <p className="text-xs font-semibold text-stone-400">atraso médio que a galera prevê {noShowCount > 0 && `• ${noShowCount} já desistiram (não vem)`}</p>
              <div className="mt-4 h-4 overflow-hidden rounded-full border-2 border-white/80 bg-stone-700">
                <div className={`h-full transition-all duration-700 ${lateMeterPct > 65 ? "bg-red-500" : lateMeterPct > 40 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${lateMeterPct}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] font-black text-stone-400"><span>PONTUAL</span><span>{lateMeterLabel}</span><span>FANTASMA</span></div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-stone-700 bg-stone-800 p-3">
                  <p className="font-display text-2xl font-black">{totalVotes}</p><p className="text-[10px] font-bold tracking-wide text-stone-400">APOSTAS</p>
                </div>
                {isOrganizer ? (
                  <div className="rounded-2xl border border-stone-700 bg-stone-800 p-3">
                    <p className="font-display line-clamp-1 text-lg font-black">{topSlot && totalVotes ? `${topSlot.label}` : "—"}</p>
                    <p className="text-[10px] font-bold tracking-wide text-stone-400">FAVORITO DA GALERA{topSlot && totalVotes ? ` (${topSlot.count})` : ""}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-stone-700 bg-stone-800 p-3">
                    <p className="font-display text-2xl font-black">{noShowCount}</p>
                    <p className="text-[10px] font-bold tracking-wide text-stone-400">JÁ DESISTIRAM (NÃO VEM)</p>
                  </div>
                )}
              </div>
              {myVote && (
                <p className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-400 p-3 text-sm font-bold text-stone-900">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" /> Sua aposta atual: {slotByIndex(myVote.slotIndex).label} ({event.startTime && myVote.slotMinutes !== 999 ? addMinutesToTime(event.startTime, myVote.slotMinutes) : "não vem"}) — pode trocar até fechar!
                </p>
              )}
            </div>
          </div>
        </section>

        {/* WINNER BANNER */}
        {isRevealed && (
          <section className="animate-pop mt-5 rounded-3xl border-2 border-stone-900 bg-amber-300 p-5 hard-shadow sm:p-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="flex items-center gap-2 font-display text-2xl font-black"><Trophy className="h-7 w-7" /> Resultado oficial!</p>
                <p className="mt-1 text-sm font-semibold text-stone-800">
                  Pedro chegou: <strong>{slotByIndex(event.actualSlotIndex!).label}</strong>
                  {event.actualSlotIndex !== 9 && <> às <strong>{addMinutesToTime(event.startTime, slotByIndex(event.actualSlotIndex!).slotMinutes)}</strong></>} — {slotByIndex(event.actualSlotIndex!).title}. {slotByIndex(event.actualSlotIndex!).description}
                </p>
              </div>
              <span className="rounded-full border-2 border-stone-900 bg-white px-3 py-1.5 text-xs font-black">{winners.length} acertou(aram)</span>
            </div>
            {winners.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {winners.map((w) => <span key={w.id} className="inline-flex items-center gap-1.5 rounded-full border-2 border-stone-900 bg-white px-3 py-1.5 text-sm font-black"><Crown className="h-4 w-4 text-amber-600" /> {w.voterName}</span>)}
                <span className="w-full text-xs font-semibold text-stone-700 sm:w-auto sm:self-center">Reis e rainhas da pontualidade alheia. O resto: só aceita.</span>
              </div>
            ) : (
              <p className="mt-3 text-sm font-bold text-stone-800">Ninguém acertou. Nem quem apostou no pior cenário foi pessimista o suficiente. Impressionante, Pedro.</p>
            )}
          </section>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          {/* VOTING COLUMN */}
          <div>
            <section className="rounded-3xl border-2 border-stone-900 bg-white p-5 hard-shadow sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl font-black sm:text-2xl">{isOpen ? "Que horas o Pedro pinta por aqui?" : "Apostas encerradas"}</h2>
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-stone-700"><Zap className="h-3.5 w-3.5" /> Atualiza ao vivo</span>
              </div>
              <p className="mt-1 text-sm text-stone-600">{isOpen ? "Escolhe um cartão, coloca seu nome e confirma. Mudou de ideia? É só votar de novo — sem julgamento (dessa vez)." : "O organizador fechou a votação. Se o Pedro ainda não chegou… bom, pelo menos vocês tentaram."}</p>

              {/* name input */}
              <div className="mt-4">
                <label htmlFor="voter-name" className="text-xs font-black tracking-wide">SEU NOME PRA APOSTA *</label>
                <input id="voter-name" value={voterName} onChange={(e) => setVoterName(e.target.value)} placeholder="Ex: Juliano, Pri, Carlos…" maxLength={40}
                  disabled={!isOpen}
                  className="mt-1.5 w-full rounded-xl border-2 border-stone-900 bg-amber-50 px-3.5 py-3 text-sm font-semibold outline-none placeholder:font-normal focus:bg-white disabled:opacity-50" />
                {myVote && <p className="mt-1.5 text-xs font-semibold text-emerald-700">Você já apostou como “{myVote.voterName}”. Escolher outro horário e confirmar troca sua aposta.</p>}
              </div>

              {/* SLOT GRID */}
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {SLOTS.map((slot) => {
                  const dist = distribution.find((d) => d.slotIndex === slot.slotIndex);
                  const count = dist?.count ?? 0;
                  const pct = dist?.pct ?? 0;
                  const time = slot.slotMinutes === 999 ? null : addMinutesToTime(event.startTime, slot.slotMinutes);
                  const isSelected = selected === slot.slotIndex;
                  const isMine = myVote?.slotIndex === slot.slotIndex;
                  const isActual = isRevealed && event.actualSlotIndex === slot.slotIndex;
                  const barW = Math.round((count / maxCount) * 100);
                  return (
                    <button key={slot.slotIndex} type="button" disabled={!isOpen}
                      onClick={() => { setSelected(slot.slotIndex); setVoteMsg(null); }}
                      className={`group relative overflow-hidden rounded-2xl border-2 border-stone-900 p-3.5 text-left transition sm:p-4 ${isSelected ? "bg-stone-900 text-white hard-shadow-sm -translate-y-0.5" : isActual ? "bg-amber-300" : "bg-white hover:bg-amber-100"} ${!isOpen ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display text-2xl font-black leading-none">{slot.slotMinutes === 999 ? <span className="flex items-center gap-1.5"><Ghost className="h-6 w-6" /> Não vem</span> : time}</p>
                          <p className={`mt-1 text-[11px] font-black tracking-wide ${isSelected ? "text-amber-300" : "text-amber-700"}`}>{slot.label} • {slot.badge}</p>
                        </div>
                        {isOrganizer && (
                          <div className="text-right">
                            <span className={`inline-block rounded-full px-2 py-1 text-[11px] font-black ${isSelected ? "bg-amber-400 text-stone-900" : "bg-stone-900 text-white"}`}>{count} voto{count === 1 ? "" : "s"}</span>
                            <p className={`mt-1 text-[11px] font-bold ${isSelected ? "text-stone-300" : "text-stone-500"}`}>{totalVotes ? `${pct}% da galera` : "seja o 1º"}</p>
                          </div>
                        )}
                      </div>
                      <p className={`font-display mt-2 text-sm font-black ${isSelected ? "text-white" : "text-stone-900"}`}>{slot.title}</p>
                      <p className={`mt-0.5 text-xs leading-snug ${isSelected ? "text-stone-300" : "text-stone-600"}`}>{slot.description}</p>
                      {/* distribution bar */}
                      {isOrganizer && (
                        <div className={`mt-3 h-2.5 overflow-hidden rounded-full border ${isSelected ? "border-white/70 bg-stone-700" : "border-stone-900 bg-amber-100"}`}>
                          <div className={`h-full transition-all duration-500 ${slot.slotMinutes === 999 ? "bg-red-500" : slot.slotMinutes === 0 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${totalVotes ? Math.max(4, barW) : 0}%` }} />
                        </div>
                      )}
                      {(isMine || isActual) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {isMine && <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black text-stone-900">SUA APOSTA</span>}
                          {isActual && <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-black text-amber-300">HORÁRIO REAL DO PEDRO</span>}
                        </div>
                      )}
                      {isSelected && <span className="absolute right-3 top-14 grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-stone-900"><Check className="h-4 w-4" /></span>}
                    </button>
                  );
                })}
              </div>

              {voteMsg && <p className={`animate-pop mt-4 rounded-xl border-2 px-3.5 py-3 text-sm font-bold ${voteMsg.type === "ok" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-red-600 bg-red-50 text-red-700"}`}>{voteMsg.text}</p>}
              {justVoted && <p className="animate-pop mt-2 flex items-center gap-1.5 text-sm font-black text-stone-900"><PartyPopper className="h-4 w-4 text-amber-600" /> Aposta salva! Agora é só esperar. Literalmente. Por horas, talvez.</p>}

              {isOpen ? (
                <button onClick={handleVote} disabled={voting || selected === null} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-2 border-stone-900 bg-amber-400 py-3.5 font-display text-sm font-black text-stone-900 hard-shadow transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50">
                  {voting ? <><RefreshCw className="h-4 w-4 animate-spin" /> SALVANDO…</> : myVote ? <><RotateCcw className="h-4 w-4" /> {selected === myVote.slotIndex ? "CONFIRMAR MINHA APOSTA" : "TROCAR MINHA APOSTA"}</> : <><Sparkles className="h-4 w-4" /> CONFIRMAR APOSTA</>}
                </button>
              ) : (
                <p className="mt-4 flex items-center gap-2 rounded-xl border-2 border-stone-900 bg-stone-100 px-3.5 py-3 text-sm font-bold text-stone-700"><Lock className="h-4 w-4 shrink-0" /> Votação fechada. {isRevealed ? "Resultado revelado acima!" : "Aguardando o organizador revelar que horas o Pedro chegou."}</p>
              )}
              <p className="mt-2.5 text-center text-[11px] font-medium text-stone-500">1 voto por pessoa (neste aparelho/navegador). Pode trocar quantas vezes quiser até fechar. Os resultados atualizam sozinhos.</p>
            </section>

            {/* DISTRIBUTION SUMMARY (só organizador) */}
            {isOrganizer && (
            <section className="mt-5 rounded-3xl border-2 border-stone-900 bg-white p-5 hard-shadow sm:p-6">
              <h3 className="font-display flex items-center gap-2 text-lg font-black"><Eye className="h-5 w-5" /> Placar da galera <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[11px] text-white">{totalVotes} votos</span></h3>
              {totalVotes === 0 ? (
                <p className="mt-3 text-sm text-stone-600">Nenhuma aposta ainda. A galera está esperando o Pedro pra decidir? Não façam isso. Apostem logo aqui em cima.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {distribution.map((d) => (
                    <div key={d.slotIndex} className="text-xs sm:text-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate font-black">{d.slotMinutes === 999 ? "Não vem" : `${addMinutesToTime(event.startTime, d.slotMinutes)} (${d.label})`}</span>
                        <span className="shrink-0 text-[11px] font-bold text-stone-500 sm:hidden">{d.count} voto{d.count === 1 ? "" : "s"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 flex-1 overflow-hidden rounded-lg border-2 border-stone-900 bg-amber-100">
                          <div className={`flex h-full items-center px-2 text-[11px] font-black text-white transition-all duration-500 ${d.slotMinutes === 999 ? "bg-red-500" : d.slotMinutes === 0 ? "bg-emerald-500" : "bg-stone-900"}`} style={{ width: `${Math.max(d.count ? 12 : 0, d.pct)}%` }}>{d.count > 0 ? `${d.count} • ${d.pct}%` : ""}</div>
                        </div>
                        <span className="hidden w-14 shrink-0 text-right font-bold text-stone-500 sm:inline">{d.count} voto{d.count === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            )}
          </div>

          {/* SIDEBAR: VOTERS + ORGANIZER */}
          <div className="space-y-5">
            {isOrganizer ? (
            <section className="rounded-3xl border-2 border-stone-900 bg-white p-5 hard-shadow">
              <h3 className="font-display flex items-center gap-2 text-lg font-black"><Users className="h-5 w-5" /> Quem já apostou <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-black">{votes.length}</span></h3>
              {votes.length === 0 ? (
                <p className="mt-3 text-sm text-stone-600">Silêncio absoluto. Nem a galera chegou ainda — efeito Pedro contagioso?</p>
              ) : (
                <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {[...votes].reverse().map((v) => {
                    const s = slotByIndex(v.slotIndex);
                    const isWinner = isRevealed && v.slotIndex === event.actualSlotIndex;
                    return (
                      <li key={v.id} className={`flex items-center justify-between gap-2 rounded-2xl border-2 border-stone-900 px-3 py-2.5 ${isWinner ? "bg-amber-300" : v.voterToken === voterToken ? "bg-emerald-50" : "bg-amber-50"}`}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">{v.voterName} {v.voterToken === voterToken && <span className="text-[10px] text-emerald-700">(você)</span>} {isWinner && <Crown className="inline h-4 w-4 text-amber-700" />}</p>
                          <p className="truncate text-[11px] font-semibold text-stone-500">{s.title}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black ${s.slotMinutes === 999 ? "bg-red-500 text-white" : s.slotMinutes === 0 ? "bg-emerald-500 text-white" : "bg-stone-900 text-white"}`}>
                          {s.slotMinutes === 999 ? "Não vem" : addMinutesToTime(event.startTime, s.slotMinutes)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button onClick={() => load(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-stone-700 underline underline-offset-2"><RefreshCw className="h-3.5 w-3.5" /> Atualizar agora</button>
            </section>
            ) : (
            <section className="rounded-3xl border-2 border-stone-900 bg-stone-900 p-5 text-white hard-shadow">
              <h3 className="font-display flex items-center gap-2 text-lg font-black"><Flame className="h-5 w-5 text-amber-400" /> Termômetro da votação</h3>
              <p className="mt-1 text-xs text-stone-400">Quem apostou o quê fica só com o organizador. Aqui vocês veem só o clima geral.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-stone-700 bg-stone-800 p-3">
                  <p className="font-display text-2xl font-black">{totalVotes}</p>
                  <p className="text-[10px] font-bold tracking-wide text-stone-400">PESSOAS JÁ APOSTARAM</p>
                </div>
                <div className="rounded-2xl border border-stone-700 bg-stone-800 p-3">
                  <p className="font-display text-2xl font-black">{totalVotes ? fmtDelay(avgDelay) : "—"}</p>
                  <p className="text-[10px] font-bold tracking-wide text-stone-400">ATRASO MÉDIO PREVISTO</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-black text-stone-300">
                <span>NÍVEL DE ATRASO</span><span className="text-amber-300">{lateMeterLabel}</span>
              </div>
              <div className="mt-1.5 h-3 overflow-hidden rounded-full border-2 border-white/80 bg-stone-700">
                <div className={`h-full transition-all duration-700 ${lateMeterPct > 65 ? "bg-red-500" : lateMeterPct > 40 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${lateMeterPct}%` }} />
              </div>
              <p className="mt-3 text-xs font-semibold text-stone-400">
                {noShowCount > 0
                  ? `${noShowCount} de ${totalVotes} já desistiram — ${Math.round((noShowCount / totalVotes) * 100)}% apostaram no "não vem".`
                  : "Ninguém apostou no \"não vem\" ainda. Otimismo (ou ingenuidade) coletiva(o)."}
              </p>
            </section>
            )}

            {/* ORGANIZER PANEL */}
            <section className="rounded-3xl border-2 border-stone-900 bg-stone-900 p-5 text-white hard-shadow">
              <button onClick={() => setShowOrganizer((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
                <span className="font-display flex items-center gap-2 text-base font-black">
                  <Crown className="h-5 w-5 text-amber-400" /> Área do organizador
                  {isOrganizer ? (
                    <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black text-stone-900 flex items-center gap-1">
                      <BadgeCheck className="h-3 w-3" /> AUTORIZADO
                    </span>
                  ) : (
                    <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] font-black text-stone-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> RESTRITO
                    </span>
                  )}
                </span>
                <ChevronRight className={`h-5 w-5 transition ${showOrganizer ? "rotate-90" : ""}`} />
              </button>
              <p className="mt-1 text-xs text-stone-400">O Pedro chegou (ou desistiu)? Revela o horário real e coroa os vencedores.</p>
              
              {showOrganizer && (
                <div className="animate-pop mt-4">
                  {isOrganizer ? (
                    <>
                      <div className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-2.5 text-xs text-emerald-300">
                        ✓ Você é o organizador deste bolão. Apenas você tem acesso a estes controles.
                      </div>
                      <label className="text-[11px] font-black tracking-wide text-amber-300">QUE HORAS O PEDRO CHEGOU DE VERDADE?</label>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {SLOTS.map((s) => (
                          <button key={s.slotIndex} onClick={() => setRevealSlot(s.slotIndex)} className={`rounded-xl border-2 px-2 py-2 text-left text-xs font-black transition ${revealSlot === s.slotIndex ? "border-amber-400 bg-amber-400 text-stone-900" : "border-stone-700 bg-stone-800 text-white hover:border-stone-500"}`}>
                            {s.slotMinutes === 999 ? "Não apareceu" : `${addMinutesToTime(event.startTime, s.slotMinutes)} (${s.label})`}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => organizerAction("reveal")} disabled={revealing} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 py-3 font-display text-sm font-black text-stone-900 disabled:opacity-60">
                        {revealing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />} REVELAR RESULTADO
                      </button>
                      <div className="mt-2 flex gap-2">
                        {event.status === "open" ? (
                          <button onClick={() => organizerAction("close")} disabled={revealing} className="flex-1 rounded-full border-2 border-white py-2 text-xs font-black disabled:opacity-60">Fechar votação</button>
                        ) : (
                          <button onClick={() => organizerAction("reopen")} disabled={revealing} className="flex-1 rounded-full border-2 border-white py-2 text-xs font-black disabled:opacity-60">Reabrir votação</button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border-2 border-stone-800 bg-stone-800/80 p-4">
                      <div className="flex items-center gap-2 text-amber-300">
                        <Lock className="h-4 w-4" />
                        <span className="text-xs font-black">ÁREA PROTEGIDA</span>
                      </div>
                      <p className="mt-1 text-xs text-stone-300 leading-relaxed">
                        Apenas quem criou este bolão pode fechar as apostas ou revelar o horário real para evitar fraudes.
                      </p>
                      <div className="mt-3">
                        <label className="text-[11px] font-bold text-stone-400">É você o organizador em outro aparelho?</label>
                        <div className="mt-1.5 flex gap-2">
                          <input
                            type="password"
                            value={inputToken}
                            onChange={(e) => setInputToken(e.target.value)}
                            placeholder="Cole seu token de organizador..."
                            className="flex-1 rounded-xl border border-stone-600 bg-stone-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                          />
                          <button
                            onClick={handleUnlockOrganizer}
                            className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-stone-900 hover:bg-amber-300"
                          >
                            Desbloquear
                          </button>
                        </div>
                        {tokenError && <p className="mt-1.5 text-[11px] text-red-400">{tokenError}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-3xl border-2 border-stone-900 bg-amber-300 p-5 hard-shadow-sm">
              <p className="flex items-center gap-1.5 font-display text-base font-black"><Flame className="h-5 w-5" /> Frases para mandar no grupo</p>
              <ul className="mt-2 space-y-1.5 text-sm font-semibold text-stone-800">
                <li>• “Apostei +2h. Se eu errar, erro pra menos.”</li>
                <li>• “Quem votou ‘no horário’ chegou agora no grupo?”</li>
                <li>• “Pedro, se você está lendo isso: já era pra estar aqui.”</li>
              </ul>
              <a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Que horas o Pedro chega no "${event.name}"? Aposta aqui: ${shareLink}`)}`} className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-stone-900 bg-white px-3 py-2 text-xs font-black hard-shadow-sm">
                <Share2 className="h-3.5 w-3.5" /> Chamar a galera no WhatsApp
              </a>
            </section>
          </div>
        </div>

        <p className="mt-8 text-center text-xs font-medium text-stone-500">
          <Clock className="mr-1 inline h-3.5 w-3.5" /> Horários gerados a cada 30 min por 4h a partir das {event.startTime} • Link do bolão: <button onClick={copyLink} className="font-bold underline underline-offset-2">{copied ? "Copiado!" : "copiar link"}</button>
        </p>
      </main>
    </div>
  );
}
