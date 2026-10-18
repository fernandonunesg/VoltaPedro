"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlarmClock, ArrowLeft, Calendar, MapPin, Users, Copy, Check, Share2, Trophy,
  Clock, Timer, Crown, Ghost, Zap, RefreshCw, Eye, Sparkles, Hourglass,
  BadgeCheck, Lock, PartyPopper, Flame, ChevronRight, Minus, Plus, Trash2
} from "lucide-react";
import { STEP_MINUTES, NO_SHOW_MINUTES, addMinutesToTime, slotByIndex, personaForMinutes, minutesToLabel, clampDelay } from "@/lib/slots";

type Vote = { id: string; voterName: string; voterToken: string; slotIndex: number; slotMinutes: number; createdAt: string; updatedAt: string };
type Dist = { minutes: number; count: number; pct: number };
type PublicVoter = { id: string; voterName: string };
type EventData = {
  id: string; slug: string; name: string; description: string; eventDate: string;
  startTime: string; location: string; organizerName: string; status: string;
  actualSlotIndex: number | null; actualSlotMinutes: number | null; createdAt: string;
};

function TimeStepper({
  startTime, minutes, onChange, disabled, tone = "light",
}: {
  startTime: string;
  minutes: number;
  onChange: (m: number) => void;
  disabled?: boolean;
  tone?: "light" | "dark";
}) {
  const noShow = minutes >= NO_SHOW_MINUTES;
  const persona = personaForMinutes(minutes);
  const time = noShow ? "—" : addMinutesToTime(startTime, minutes);
  const dark = tone === "dark";

  const bump = (delta: number) => {
    if (disabled) return;
    const base = noShow ? 0 : minutes;
    onChange(clampDelay(base + delta));
  };

  const btn = `grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 transition disabled:opacity-30 ${dark ? "border-stone-600 bg-stone-800 text-white hover:border-stone-400" : "border-stone-900 bg-white text-stone-900 hover:bg-amber-100"}`;
  const group = `flex items-center justify-between gap-1 rounded-xl border-2 p-1.5 ${dark ? "border-stone-700 bg-stone-900/40" : "border-stone-900 bg-white"}`;
  const chip = (active: boolean) => `rounded-full border-2 px-2.5 py-1 text-[11px] font-black transition disabled:opacity-40 ${active ? "border-amber-500 bg-amber-400 text-stone-900" : dark ? "border-stone-600 text-stone-200 hover:border-stone-400" : "border-stone-900 bg-white hover:bg-amber-100"}`;

  return (
    <div className={`rounded-2xl border-2 p-3.5 ${dark ? "border-stone-700 bg-stone-800/60" : "border-stone-900 bg-amber-50"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[10px] font-black tracking-wide ${dark ? "text-stone-400" : "text-stone-500"}`}>{noShow ? "SUA APOSTA" : "PREVISÃO DE CHEGADA"}</p>
          <p className="font-display text-4xl font-black leading-none">{noShow ? "Não vem" : time}</p>
          <p className={`mt-1 text-xs font-bold ${dark ? "text-amber-300" : "text-amber-700"}`}>{noShow ? "fora da régua do tempo" : `${minutesToLabel(minutes)} do início`}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${dark ? "bg-amber-400 text-stone-900" : "bg-stone-900 text-white"}`}>{persona.badge}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className={group}>
          <button type="button" disabled={disabled} onClick={() => bump(-60)} className={btn} aria-label="Menos uma hora"><Minus className="h-4 w-4" /></button>
          <span className="text-center text-sm font-black leading-tight">HORA</span>
          <button type="button" disabled={disabled} onClick={() => bump(60)} className={btn} aria-label="Mais uma hora"><Plus className="h-4 w-4" /></button>
        </div>
        <div className={group}>
          <button type="button" disabled={disabled} onClick={() => bump(-STEP_MINUTES)} className={btn} aria-label="Menos 5 minutos"><Minus className="h-4 w-4" /></button>
          <span className="text-center text-sm font-black leading-tight">MIN</span>
          <button type="button" disabled={disabled} onClick={() => bump(STEP_MINUTES)} className={btn} aria-label="Mais 5 minutos"><Plus className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[30, 60, 120, 240].map((m) => (
          <button key={m} type="button" disabled={disabled} onClick={() => onChange(m)} className={chip(!noShow && minutes === m)}>{minutesToLabel(m)}</button>
        ))}
        <button type="button" disabled={disabled} onClick={() => onChange(NO_SHOW_MINUTES)} className={chip(noShow)}>Não vem</button>
      </div>

      {!noShow && (
        <p className={`mt-2.5 text-xs font-semibold leading-snug ${dark ? "text-stone-300" : "text-stone-600"}`}>
          <span className="font-black">{persona.title}.</span> {persona.description}
        </p>
      )}
    </div>
  );
}

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
  const router = useRouter();
  const slug = params.slug;
  const [event, setEvent] = useState<EventData | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [publicVoters, setPublicVoters] = useState<PublicVoter[]>([]);
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
  const [pick, setPick] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteMsg, setVoteMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const [liveFlash, setLiveFlash] = useState(false);
  const prevTotal = useRef(0);

  const [revealMinutes, setRevealMinutes] = useState<number>(60);
  const [revealing, setRevealing] = useState(false);
  const [showOrganizer, setShowOrganizer] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [organizerToken, setOrganizerToken] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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
      setEvent(data.event); setVotes(data.votes); setDistribution(data.distribution); setPublicVoters(data.publicVoters || []);
      setTotalVotes(data.totalVotes); setAvgDelay(data.avgPredictedDelay);
      setNoShowCount(data.noShowCount); setWinners(data.winners || []);
      setIsOrganizer(Boolean(data.isOrganizer));
      setMyVote(data.myVote ?? null);
      // restore my vote selection
      const mine = data.myVote;
      if (mine && !silent) setPick(mine.slotMinutes);
      else if (mine) setPick((cur) => cur ?? mine.slotMinutes);
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
  const actualMinutes = event
    ? (event.actualSlotMinutes != null ? event.actualSlotMinutes : event.actualSlotIndex != null ? slotByIndex(event.actualSlotIndex).slotMinutes : null)
    : null;
  const isRevealed = actualMinutes !== null;

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
    // 0 min -> 5%, 480 -> 85%, no-show pushes up
    const base = Math.min(92, 5 + (avgDelay / 480) * 80 + (noShowCount / Math.max(1, totalVotes)) * 20);
    return Math.round(base);
  }, [avgDelay, noShowCount, totalVotes]);
  const lateMeterLabel = lateMeterPct < 25 ? "OTIMISTA (INGÊNUO)" : lateMeterPct < 45 ? "ATRASINHO LEVE" : lateMeterPct < 65 ? "CLÁSSICO PEDRO" : lateMeterPct < 82 ? "MODO LENDA" : "ARQUIVO X / FANTASMA";

  async function handleVote() {
    if (pick === null) { setVoteMsg({ type: "err", text: "Escolhe um horário primeiro! Use os botões de hora e minuto aí em cima." }); return; }
    if (!voterName.trim() || voterName.trim().length < 2) { setVoteMsg({ type: "err", text: "Coloca seu nome pra aposta valer — senão como a gente zoa depois?" }); document.getElementById("voter-name")?.focus(); return; }
    setVoting(true); setVoteMsg(null);
    try {
      localStorage.setItem("pedro_voter_name", voterName.trim());
      const res = await fetch(`/api/events/${slug}/vote`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterName: voterName.trim(), voterToken, slotMinutes: pick }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao votar");
      setJustVoted(true); setTimeout(() => setJustVoted(false), 2600);
      setVoteMsg({ type: "ok", text: `Aposta registrada e travada! Você cravou ${minutesToLabel(pick)} — ${personaForMinutes(pick).title}. Agora não dá mais pra mudar. Boa sorte — você vai precisar.` });
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
        body: JSON.stringify(action === "reveal" ? { action, actualSlotMinutes: revealMinutes, organizerToken: token } : { action, organizerToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      await load(true);
    } catch (e) { alert(e instanceof Error ? e.message : "Erro"); } finally { setRevealing(false); }
  }

  async function handleDelete() {
    if (!event || deleteConfirmName.trim() !== event.name) return;
    setDeleting(true); setDeleteError("");
    try {
      const token = organizerToken || localStorage.getItem(`pedro_organizer_${slug}`) || "";
      const res = await fetch(`/api/events/${slug}`, {
        method: "DELETE",
        headers: { "x-organizer-token": token },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao excluir");
      localStorage.removeItem(`pedro_organizer_${slug}`);
      router.push("/");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Erro ao excluir");
      setDeleting(false);
    }
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
                    <p className="font-display line-clamp-1 text-lg font-black">{topSlot && totalVotes ? (topSlot.minutes >= NO_SHOW_MINUTES ? "Não vem" : personaForMinutes(topSlot.minutes).label) : "—"}</p>
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
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" /> Sua aposta atual: {myVote.slotMinutes >= NO_SHOW_MINUTES ? "Não vem" : `${addMinutesToTime(event.startTime, myVote.slotMinutes)} (${minutesToLabel(myVote.slotMinutes)})`} — travada, sem trocas!
                </p>
              )}
            </div>
          </div>
        </section>

        {/* WINNER BANNER */}
        {isRevealed && actualMinutes !== null && (
          <section className="animate-pop mt-5 rounded-3xl border-2 border-stone-900 bg-amber-300 p-5 hard-shadow sm:p-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="flex items-center gap-2 font-display text-2xl font-black"><Trophy className="h-7 w-7" /> Resultado oficial!</p>
                <p className="mt-1 text-sm font-semibold text-stone-800">
                  Pedro chegou: <strong>{actualMinutes >= NO_SHOW_MINUTES ? "não veio" : addMinutesToTime(event.startTime, actualMinutes)}</strong>
                  {actualMinutes < NO_SHOW_MINUTES && <> às <strong>{minutesToLabel(actualMinutes)}</strong> do início</>} — {personaForMinutes(actualMinutes).title}. {personaForMinutes(actualMinutes).description}
                </p>
              </div>
              <span className="rounded-full border-2 border-stone-900 bg-white px-3 py-1.5 text-xs font-black">{winners.length} {winners.length === 1 ? "chegou mais perto" : "chegaram mais perto"}</span>
            </div>
            {winners.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {winners.map((w) => <span key={w.id} className="inline-flex items-center gap-1.5 rounded-full border-2 border-stone-900 bg-white px-3 py-1.5 text-sm font-black"><Crown className="h-4 w-4 text-amber-600" /> {w.voterName}</span>)}
                <span className="w-full text-xs font-semibold text-stone-700 sm:w-auto sm:self-center">Reis e rainhas da pontualidade alheia. O resto: só aceita.</span>
              </div>
            ) : (
              <p className="mt-3 text-sm font-bold text-stone-800">Ninguém arriscou. Nem quem apostou no pior cenário foi pessimista o suficiente. Impressionante, Pedro.</p>
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
              <p className="mt-1 text-sm text-stone-600">{isOpen ? "Escolhe a hora e o minuto, coloca seu nome e confirma. Vale do horário marcado até 8h depois. Atenção: a aposta é definitiva — depois de confirmar, não dá mais pra mudar." : "O organizador fechou a votação. Se o Pedro ainda não chegou… bom, pelo menos vocês tentaram."}</p>

              {myVote ? (
                <div className="mt-4 rounded-2xl border-2 border-stone-900 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-stone-900 bg-emerald-500 text-white"><Lock className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black tracking-wide text-emerald-700">APOSTA TRAVADA</p>
                      <p className="truncate text-sm font-black">{myVote.voterName}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div>
                      <p className="font-display text-4xl font-black leading-none">{myVote.slotMinutes >= NO_SHOW_MINUTES ? "Não vem" : addMinutesToTime(event.startTime, myVote.slotMinutes)}</p>
                      <p className="mt-1 text-xs font-bold text-amber-700">{myVote.slotMinutes >= NO_SHOW_MINUTES ? "fora da régua do tempo" : `${minutesToLabel(myVote.slotMinutes)} do início`}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-stone-900 px-2.5 py-1 text-[10px] font-black text-white">{personaForMinutes(myVote.slotMinutes).badge}</span>
                  </div>
                  <p className="mt-2.5 text-xs font-semibold text-stone-600"><span className="font-black">{personaForMinutes(myVote.slotMinutes).title}.</span> {personaForMinutes(myVote.slotMinutes).description}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-stone-500"><Lock className="h-3.5 w-3.5" /> Aposta única e definitiva. Igual o Pedro: apareceu uma vez e sumiu.</p>
                </div>
              ) : (
                <>
                  {/* name input */}
                  <div className="mt-4">
                    <label htmlFor="voter-name" className="text-xs font-black tracking-wide">SEU NOME PRA APOSTA *</label>
                    <input id="voter-name" value={voterName} onChange={(e) => setVoterName(e.target.value)} placeholder="Ex: Juliano, Pri, Carlos…" maxLength={40}
                      disabled={!isOpen}
                      className="mt-1.5 w-full rounded-xl border-2 border-stone-900 bg-amber-50 px-3.5 py-3 text-sm font-semibold outline-none placeholder:font-normal focus:bg-white disabled:opacity-50" />
                  </div>

                  {/* TIME PICKER */}
                  <div className="mt-4">
                    <TimeStepper
                      startTime={event.startTime}
                      minutes={pick ?? 60}
                      onChange={(m) => { setPick(m); setVoteMsg(null); }}
                      disabled={!isOpen}
                    />
                  </div>

                  {isOpen ? (
                    <button onClick={handleVote} disabled={voting || pick === null} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-2 border-stone-900 bg-amber-400 py-3.5 font-display text-sm font-black text-stone-900 hard-shadow transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50">
                      {voting ? <><RefreshCw className="h-4 w-4 animate-spin" /> SALVANDO…</> : <><Sparkles className="h-4 w-4" /> CONFIRMAR APOSTA</>}
                    </button>
                  ) : (
                    <p className="mt-4 flex items-center gap-2 rounded-xl border-2 border-stone-900 bg-stone-100 px-3.5 py-3 text-sm font-bold text-stone-700"><Lock className="h-4 w-4 shrink-0" /> Votação fechada. {isRevealed ? "Resultado revelado acima!" : "Aguardando o organizador revelar que horas o Pedro chegou."}</p>
                  )}
                </>
              )}

              {voteMsg && <p className={`animate-pop mt-4 rounded-xl border-2 px-3.5 py-3 text-sm font-bold ${voteMsg.type === "ok" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-red-600 bg-red-50 text-red-700"}`}>{voteMsg.text}</p>}
              {justVoted && <p className="animate-pop mt-2 flex items-center gap-1.5 text-sm font-black text-stone-900"><PartyPopper className="h-4 w-4 text-amber-600" /> Aposta salva e travada! Agora é só esperar. Literalmente. Por horas, talvez.</p>}
              <p className="mt-2.5 text-center text-[11px] font-medium text-stone-500">1 voto por pessoa (neste aparelho/navegador). A aposta é definitiva — depois de confirmar, não dá mais pra trocar. Os resultados atualizam sozinhos.</p>
            </section>

            {/* DISTRIBUTION SUMMARY (só organizador) */}
            {isOrganizer && (
            <section className="mt-5 rounded-3xl border-2 border-stone-900 bg-white p-5 hard-shadow sm:p-6">
              <h3 className="font-display flex items-center gap-2 text-lg font-black"><Eye className="h-5 w-5" /> Placar da galera <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[11px] text-white">{totalVotes} votos</span></h3>
              {totalVotes === 0 ? (
                <p className="mt-3 text-sm text-stone-600">Nenhuma aposta ainda. A galera está esperando o Pedro pra decidir? Não façam isso. Apostem logo aqui em cima.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {distribution.filter((d) => d.count > 0).map((d) => (
                    <div key={d.minutes} className="text-xs sm:text-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate font-black">{d.minutes >= NO_SHOW_MINUTES ? "Não vem" : `${addMinutesToTime(event.startTime, d.minutes)} · ${personaForMinutes(d.minutes).badge}`}</span>
                        <span className="shrink-0 text-[11px] font-bold text-stone-500 sm:hidden">{d.count} voto{d.count === 1 ? "" : "s"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 flex-1 overflow-hidden rounded-lg border-2 border-stone-900 bg-amber-100">
                          <div className={`flex h-full items-center px-2 text-[11px] font-black text-white transition-all duration-500 ${d.minutes >= NO_SHOW_MINUTES ? "bg-red-500" : d.minutes === 0 ? "bg-emerald-500" : "bg-stone-900"}`} style={{ width: `${Math.max(d.count ? 12 : 0, d.pct)}%` }}>{d.count} • {d.pct}%</div>
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
                    const noShow = v.slotMinutes >= NO_SHOW_MINUTES;
                    const isWinner = winners.some((w) => w.id === v.id);
                    return (
                      <li key={v.id} className={`flex items-center justify-between gap-2 rounded-2xl border-2 border-stone-900 px-3 py-2.5 ${isWinner ? "bg-amber-300" : v.voterToken === voterToken ? "bg-emerald-50" : "bg-amber-50"}`}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">{v.voterName} {v.voterToken === voterToken && <span className="text-[10px] text-emerald-700">(você)</span>} {isWinner && <Crown className="inline h-4 w-4 text-amber-700" />}</p>
                          <p className="truncate text-[11px] font-semibold text-stone-500">{noShow ? "Não vem" : personaForMinutes(v.slotMinutes).title}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black ${noShow ? "bg-red-500 text-white" : v.slotMinutes === 0 ? "bg-emerald-500 text-white" : "bg-stone-900 text-white"}`}>
                          {noShow ? "Não vem" : addMinutesToTime(event.startTime, v.slotMinutes)}
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
              <p className="mt-1 text-xs text-stone-400">O clima geral da votação — e, aqui embaixo, quem já apostou. Os horários de cada aposta ficam só com o organizador.</p>
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
              <div className="mt-4 border-t border-stone-700 pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black tracking-wide text-amber-300">QUEM JÁ APOSTOU</p>
                  <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[11px] font-black text-stone-300">{publicVoters.length}</span>
                </div>
                {publicVoters.length === 0 ? (
                  <p className="mt-2 text-xs text-stone-500">Ninguém apostou ainda. Seja o primeiro — aposta aí em cima.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {publicVoters.map((v) => {
                      const mine = myVote?.id === v.id;
                      return (
                        <span key={v.id} className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${mine ? "border-emerald-400 bg-emerald-500/15 text-emerald-300" : "border-stone-700 bg-stone-800 text-stone-100"}`}>
                          <span className="truncate">{v.voterName}</span>
                          {mine && <span className="text-[9px] font-bold text-emerald-400">VOCÊ</span>}
                        </span>
                      );
                    })}
                  </div>
                )}
                <p className="mt-2 text-[10px] font-semibold text-stone-500">O horário que cada um apostou fica só com o organizador.</p>
              </div>
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
                      <div className="mt-2">
                        <TimeStepper startTime={event.startTime} minutes={revealMinutes} onChange={setRevealMinutes} tone="dark" />
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

                      <div className="mt-4 border-t border-stone-700 pt-3">
                        {!showDelete ? (
                          <button onClick={() => { setShowDelete(true); setDeleteConfirmName(""); setDeleteError(""); }} className="inline-flex items-center gap-1.5 text-[11px] font-black text-red-300 underline underline-offset-2 transition hover:text-red-200">
                            <Trash2 className="h-3.5 w-3.5" /> Excluir evento
                          </button>
                        ) : (
                          <div className="rounded-xl border border-red-500/50 bg-red-950/40 p-3">
                            <p className="flex items-center gap-1.5 text-xs font-black text-red-300"><Trash2 className="h-3.5 w-3.5" /> EXCLUIR ESTE EVENTO?</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-stone-300">
                              Isso apaga o evento e as {totalVotes} aposta{totalVotes === 1 ? "" : "s"} de vez. Não tem volta. Digite <strong className="text-white">{event.name}</strong> para confirmar.
                            </p>
                            <input
                              value={deleteConfirmName}
                              onChange={(e) => setDeleteConfirmName(e.target.value)}
                              placeholder="Nome do evento"
                              className="mt-2 w-full rounded-xl border border-stone-600 bg-stone-900 px-3 py-2 text-xs text-white outline-none focus:border-red-400"
                            />
                            {deleteError && <p className="mt-1.5 text-[11px] font-bold text-red-400">{deleteError}</p>}
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={handleDelete}
                                disabled={deleting || deleteConfirmName.trim() !== event.name}
                                className="flex-1 rounded-full bg-red-500 py-2 text-xs font-black text-white disabled:opacity-50"
                              >
                                {deleting ? "EXCLUINDO…" : "EXCLUIR DEFINITIVAMENTE"}
                              </button>
                              <button
                                onClick={() => setShowDelete(false)}
                                disabled={deleting}
                                className="rounded-full border-2 border-stone-600 px-3 py-2 text-xs font-black text-stone-200 disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
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
          <Clock className="mr-1 inline h-3.5 w-3.5" /> Aposte qualquer horário das {event.startTime} até 8h depois, em passos de 5 min • Link do bolão: <button onClick={copyLink} className="font-bold underline underline-offset-2">{copied ? "Copiado!" : "copiar link"}</button>
        </p>
      </main>
    </div>
  );
}
