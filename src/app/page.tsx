"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock, Calendar, MapPin, Users, Copy, Check, Share2, Sparkles, Trophy,
  Timer, AlarmClock, ArrowRight, Plus, Zap, MessageCircle, RefreshCw,
  Hourglass, Crown, Ghost, PartyPopper, Link2, ChevronRight, Eye
} from "lucide-react";
import { addMinutesToTime, EXCUSE_GENERATOR, FUNNY_QUOTES, personaForMinutes, minutesToLabel, NO_SHOW_MINUTES } from "@/lib/slots";

type EventItem = {
  id: string; slug: string; name: string; description: string; eventDate: string;
  startTime: string; location: string; organizerName: string; status: string;
  actualSlotIndex: number | null; createdAt: string; voteCount: number;
};

const HERO_IMG = "/principal.jpg";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatDateBR(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [stats, setStats] = useState({ totalEvents: 0, totalVotes: 0, avgPredictedDelay: 0 });
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [name, setName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [eventDate, setEventDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("22:00");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [excuse, setExcuse] = useState(EXCUSE_GENERATOR[0]);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      const data = await res.json();
      setEvents(data.events || []);
      if (data.stats) setStats(data.stats);
    } catch { /* ignore */ } finally { setLoadingEvents(false); }
  }, []);

  useEffect(() => { loadEvents(); const t = setInterval(loadEvents, 8000); return () => clearInterval(t); }, [loadEvents]);
  useEffect(() => { const t = setInterval(() => setQuoteIdx((i) => (i + 1) % FUNNY_QUOTES.length), 3800); return () => clearInterval(t); }, []);

  const previewSlots = useMemo(() => {
    if (!/^\d{2}:\d{2}$/.test(startTime)) return [];
    const moments = [0, 60, 120, 180, 240, 300, 360, 420, 480];
    return [
      ...moments.map((m) => ({ minutes: m, time: addMinutesToTime(startTime, m), persona: personaForMinutes(m) })),
      { minutes: NO_SHOW_MINUTES, time: "—", persona: personaForMinutes(NO_SHOW_MINUTES) },
    ];
  }, [startTime]);

  const fullLink = createdSlug ? `${typeof window !== "undefined" ? window.location.origin : ""}/evento/${createdSlug}` : "";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(""); setCreating(true); setCreatedSlug(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, organizerName, eventDate, startTime, location, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar evento");
      setCreatedSlug(data.event.slug);
      if (data.organizerToken) {
        localStorage.setItem(`pedro_organizer_${data.event.slug}`, data.organizerToken);
      }
      loadEvents();
      setTimeout(() => document.getElementById("criado")?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Algo deu errado");
    } finally { setCreating(false); }
  }

  async function copyText(text: string, setFn: (v: boolean) => void) {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setFn(true); setTimeout(() => setFn(false), 2000);
  }

  const openEvents = events.filter((e) => e.status === "open");
  const maxVotes = Math.max(1, ...events.map((e) => e.voteCount));

  return (
    <div className="min-h-screen bg-amber-50">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b-2 border-stone-900 bg-amber-400">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-stone-900 bg-white hard-shadow-sm">
              <AlarmClock className="h-5 w-5 text-stone-900" />
            </span>
            <span className="font-display leading-none">
              <span className="block text-[15px] font-black tracking-tight sm:text-lg">PEDRO DIAS</span>
              <span className="block text-[10px] font-bold tracking-[0.18em] text-stone-700 sm:text-[11px]">VAI CHEGAR QUANDO?</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm font-bold md:flex">
            <a href="#criar" className="rounded-full px-3 py-2 hover:bg-stone-900 hover:text-white transition">Criar evento</a>
            <a href="#eventos" className="rounded-full px-3 py-2 hover:bg-stone-900 hover:text-white transition">Eventos ao vivo</a>
            <a href="#como-funciona" className="rounded-full px-3 py-2 hover:bg-stone-900 hover:text-white transition">Como funciona</a>
          </nav>
          <a href="#criar" className="inline-flex items-center gap-1.5 rounded-full border-2 border-stone-900 bg-stone-900 px-3 py-2 text-xs font-black text-white hard-shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] transition sm:px-4 sm:text-sm">
            <Plus className="h-4 w-4" /> CRIAR BOLÃO
          </a>
        </div>
        {/* marquee */}
        <div className="overflow-hidden border-t-2 border-stone-900 bg-stone-900 py-1.5 text-amber-300">
          <div className="flex w-max animate-marquee gap-0 whitespace-nowrap text-[11px] font-bold tracking-[0.14em]">
            {[0, 1].map((k) => (
              <span key={k} className="flex">
                {["TÔ CHEGANDO (MENTIRA)", "FALTAM 5 MINUTINHOS", "O TRÂNSITO, GENTE…", "VISUALIZOU E SUMIU", "SAINDO DE CASA = NO BANHO", "HORÁRIO DO PEDRO ≠ HORÁRIO REAL", "APOSTE ANTES QUE ELE CHEGUE (SE CHEGAR)"].map((t) => (
                  <span key={t} className="mx-4 flex items-center gap-2"><Zap className="h-3 w-3" />{t}</span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b-2 border-stone-900 bg-amber-50">
        <div className="dot-pattern pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-stone-900 bg-white px-3 py-1 text-[11px] font-black tracking-wide hard-shadow-sm">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" /></span>
              BOLÃO OFICIAL DO ATRASO • AO VIVO
            </div>
            <h1 className="font-display mt-5 text-[42px] font-black leading-[1.1] tracking-tight sm:text-6xl lg:text-[68px]">
              <span className="block">Pedro Dias:</span>
              <span className="my-1.5 inline-block rounded-xl bg-stone-900 px-3 py-0.5 text-amber-400 hard-shadow-sm">
                vai chegar
              </span>
              <span className="block">quando?</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-stone-700 sm:text-lg">
              O evento começa às <strong className="text-stone-900">22:00</strong>. Todo mundo sabe que isso é só uma sugestão pro Pedro.
              Crie o bolão, compartilhe o link e deixe a galera apostar de <strong>30 em 30 minutos — até 4 horas depois</strong> (ou no clássico “não aparece”).
            </p>

            <div key={quoteIdx} className="animate-pop mt-5 flex max-w-xl items-start gap-2 rounded-2xl border-2 border-stone-900 bg-white p-3.5 hard-shadow-sm">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm font-semibold italic text-stone-800">“{FUNNY_QUOTES[quoteIdx]}”</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#criar" className="inline-flex items-center gap-2 rounded-full border-2 border-stone-900 bg-amber-400 px-5 py-3 font-display text-sm font-black hard-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition">
                CRIAR MEU EVENTO <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#eventos" className="inline-flex items-center gap-2 rounded-full border-2 border-stone-900 bg-white px-5 py-3 font-display text-sm font-black hard-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition">
                <Eye className="h-4 w-4" /> VER BOLÕES ABERTOS
              </a>
            </div>

            {/* stats */}
            <div className="mt-8 grid max-w-xl grid-cols-3 overflow-hidden rounded-2xl border-2 border-stone-900 bg-white hard-shadow">
              <div className="min-w-0 border-r-2 border-stone-900 p-2.5 text-center sm:p-4">
                <p className="font-display text-xl font-black sm:text-3xl">{stats.totalEvents}</p>
                <p className="text-[9px] font-bold leading-tight tracking-wide text-stone-500 sm:text-[11px]">EVENTOS CRIADOS</p>
              </div>
              <div className="min-w-0 border-r-2 border-stone-900 p-2.5 text-center sm:p-4">
                <p className="font-display text-xl font-black sm:text-3xl">{stats.totalVotes}</p>
                <p className="text-[9px] font-bold leading-tight tracking-wide text-stone-500 sm:text-[11px]">APOSTAS FEITAS</p>
              </div>
              <div className="min-w-0 p-2.5 text-center sm:p-4">
                <p className="font-display text-xl font-black text-red-600 sm:text-3xl">+{stats.avgPredictedDelay}<span className="text-sm sm:text-base">min</span></p>
                <p className="text-[9px] font-bold leading-tight tracking-wide text-stone-500 sm:text-[11px]">ATRASO MÉDIO PREVISTO</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] font-medium text-stone-500">* Dados reais do banco. A média só aumenta. Coincidência? Acho que não.</p>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-3xl border-2 border-stone-900 hard-shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HERO_IMG} alt="Ilustração do Pedro de braços abertos dizendo '5 minutinhos'" className="h-64 w-full bg-white object-contain sm:h-80 lg:h-[380px]" />
              <div className="flex items-center justify-between gap-2 bg-white px-4 py-3">
                <p className="text-xs font-bold text-stone-700 sm:text-sm">A galera já chegou. O Pedro? <span className="text-red-600">“a caminho”.</span></p>
                <span className="shrink-0 rounded-full bg-red-100 px-2 py-1 text-[10px] font-black text-red-700">+2h47 DE ESPERA</span>
              </div>
            </div>
            {/* floating cards */}
            <div className="animate-floaty absolute -left-2 -top-4 hidden rounded-2xl border-2 border-stone-900 bg-white p-3 hard-shadow-sm sm:block lg:-left-6">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-400 text-stone-900"><Hourglass className="h-5 w-5" /></span>
                <div><p className="font-display text-sm font-black leading-none">Late-o-Meter</p><p className="text-[11px] font-semibold text-red-600">Nível: LENDÁRIO</p></div>
              </div>
              <div className="mt-2 h-2.5 w-44 overflow-hidden rounded-full border border-stone-900 bg-amber-100"><div className="h-full w-[86%] bg-red-500" /></div>
            </div>
          </div>
        </div>
      </section>

      {/* CREATE + PREVIEW */}
      <section id="criar" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-black tracking-[0.18em] text-amber-700"><Sparkles className="h-4 w-4" /> ORGANIZADOR, É SUA VEZ</p>
            <h2 className="font-display mt-1 text-3xl font-black tracking-tight sm:text-4xl">Crie o evento em 30 segundos</h2>
            <p className="mt-1 max-w-2xl text-sm text-stone-600 sm:text-base">Defina o horário oficial. A gente gera automaticamente as apostas de 30 em 30 min pelas próximas 4 horas. Você só compartilha o link e assiste o caos.</p>
          </div>
          <span className="rounded-2xl border-2 border-stone-900 bg-white px-3 py-1.5 text-xs font-black leading-snug hard-shadow-sm sm:rounded-full">JANELA DE APOSTAS: 4 HORAS • 9 HORÁRIOS + “NÃO VEM”</span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* FORM */}
          <form onSubmit={handleCreate} className="min-w-0 rounded-3xl border-2 border-stone-900 bg-white p-5 hard-shadow sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-black tracking-wide">NOME DO EVENTO *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Churrasco na casa da Ju, Aniver do Rafa…" className="mt-1.5 w-full rounded-xl border-2 border-stone-900 bg-amber-50 px-3.5 py-3 text-sm font-semibold outline-none placeholder:font-normal focus:bg-white" required minLength={3} />
              </div>
              <div>
                <label className="text-xs font-black tracking-wide">SEU NOME (ORGANIZADOR)</label>
                <input value={organizerName} onChange={(e) => setOrganizerName(e.target.value)} placeholder="Ex: Marina" className="mt-1.5 w-full rounded-xl border-2 border-stone-900 bg-amber-50 px-3.5 py-3 text-sm font-semibold outline-none focus:bg-white" />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-black tracking-wide"><MapPin className="h-3.5 w-3.5" /> LOCAL</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Casa, bar, endereço…" className="mt-1.5 w-full rounded-xl border-2 border-stone-900 bg-amber-50 px-3.5 py-3 text-sm font-semibold outline-none focus:bg-white" />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-black tracking-wide"><Calendar className="h-3.5 w-3.5" /> DATA DO EVENTO *</label>
                <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="mt-1.5 w-full rounded-xl border-2 border-stone-900 bg-amber-50 px-3.5 py-3 text-sm font-semibold outline-none focus:bg-white" required />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-black tracking-wide"><Clock className="h-3.5 w-3.5" /> HORÁRIO OFICIAL *</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1.5 w-full rounded-xl border-2 border-stone-900 bg-amber-50 px-3.5 py-3 text-sm font-semibold outline-none focus:bg-white" required />
                <p className="mt-1 text-[11px] font-medium text-stone-500">As apostas vão de {startTime || "--:--"} até {startTime ? addMinutesToTime(startTime, 480) : "--:--"} (8h depois), em passos de 5 min.</p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-black tracking-wide">DESCRIÇÃO (OPCIONAL, ZOEIRA LIBERADA)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Ex: Tragam cadeira pra esperar. O Pedro confirmou presença — o que, historicamente, não significa nada." className="mt-1.5 w-full resize-none rounded-xl border-2 border-stone-900 bg-amber-50 px-3.5 py-3 text-sm font-semibold outline-none focus:bg-white" />
              </div>
            </div>

            {createError && <p className="mt-4 rounded-xl border-2 border-red-600 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700">{createError}</p>}

            <button disabled={creating} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border-2 border-stone-900 bg-stone-900 py-3.5 font-display text-sm font-black text-white hard-shadow-sm transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-60">
              {creating ? <><RefreshCw className="h-4 w-4 animate-spin" /> CRIANDO…</> : <><PartyPopper className="h-4 w-4 text-amber-400" /> PUBLICAR EVENTO E GERAR LINK</>}
            </button>
            <p className="mt-2.5 text-center text-[11px] font-medium text-stone-500">Sem cadastro. Sem senha. Só o link e a verdade sobre o Pedro.</p>

            {createdSlug && (
              <div id="criado" className="animate-pop mt-5 min-w-0 rounded-2xl border-2 border-stone-900 bg-amber-300 p-4">
                <p className="flex items-center gap-1.5 font-display text-sm font-black"><Check className="h-4 w-4" /> EVENTO NO AR! MANDA PRA GALERA:</p>
                <div className="mt-2.5 flex min-w-0 flex-col gap-2 sm:flex-row">
                  <code className="flex-1 truncate rounded-xl border-2 border-stone-900 bg-white px-3 py-2.5 text-xs font-bold sm:text-sm">{fullLink}</code>
                  <button type="button" onClick={() => copyText(fullLink, setCopied)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-stone-900 bg-stone-900 px-4 py-2.5 text-xs font-black text-white">
                    {copied ? <><Check className="h-4 w-4" /> COPIADO!</> : <><Copy className="h-4 w-4" /> COPIAR LINK</>}
                  </button>
                  <Link href={`/evento/${createdSlug}`} className="inline-flex items-center justify-center gap-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-2.5 text-xs font-black">
                    ABRIR BOLÃO <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Apostem: que horas o Pedro vai chegar? ${fullLink}`)}`} className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-black text-stone-900 border-2 border-stone-900">
                  <Share2 className="h-3.5 w-3.5" /> Compartilhar no WhatsApp
                </a>
              </div>
            )}
          </form>

          {/* LIVE PREVIEW OF SLOTS */}
          <div className="rounded-3xl border-2 border-stone-900 bg-stone-900 p-5 text-white hard-shadow sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-black">Prévia das apostas</h3>
              <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-black text-stone-900">INÍCIO {startTime || "--:--"}</span>
            </div>
            <p className="mt-1 text-xs text-stone-400">Você escolhe hora e minuto • de {startTime || "--:--"} até 8h depois • passos de 5 min</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {previewSlots.map((s) => (
                <div key={s.minutes} className={`rounded-2xl border-2 p-3 ${s.minutes >= NO_SHOW_MINUTES ? "border-red-400 bg-red-950" : s.minutes === 0 ? "border-emerald-400 bg-emerald-950" : "border-stone-700 bg-stone-800"}`}>
                  <p className="font-display text-lg font-black leading-none">{s.minutes >= NO_SHOW_MINUTES ? <Ghost className="h-5 w-5" /> : s.time}</p>
                  <p className="mt-1 text-[11px] font-black tracking-wide text-amber-300">{minutesToLabel(s.minutes)} • {s.persona.badge}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-stone-300">{s.persona.title}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-stone-700 bg-stone-800 p-3.5">
              <p className="text-[11px] font-black tracking-wide text-amber-300">EXEMPLO DA REGRA</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-300">Começa às 22:00? Vale qualquer palpite de 22:00 até 06:00 do dia seguinte — inclusive 22:47. Ganha quem chegar mais perto. Simples, cruel e estatisticamente justo.</p>
            </div>
            {/* excuse generator */}
            <div className="mt-3 rounded-2xl bg-amber-400 p-3.5 text-stone-900">
              <p className="text-[11px] font-black tracking-wide">GERADOR DE DESCULPAS DO PEDRO™</p>
              <p className="mt-1 min-h-8 text-sm font-bold">“{excuse}”</p>
              <button type="button" onClick={() => setExcuse(EXCUSE_GENERATOR[Math.floor(Math.random() * EXCUSE_GENERATOR.length)])} className="mt-2 inline-flex items-center gap-1.5 rounded-full border-2 border-stone-900 bg-white px-3 py-1.5 text-xs font-black hard-shadow-sm active:translate-x-[1px] active:translate-y-[1px] transition">
                <RefreshCw className="h-3.5 w-3.5" /> Gerar outra desculpa
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="border-y-2 border-stone-900 bg-white">
        <div className="mx-auto max-w-7xl scroll-mt-28 px-4 py-12 sm:px-6">
          <h2 className="font-display text-center text-3xl font-black tracking-tight">Como funciona (mais pontual que o Pedro)</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { n: "1", icon: Calendar, title: "Organizador cria", desc: "Nome, data e horário oficial do evento. A janela de aposta vai do horário marcado até 8h depois." },
              { n: "2", icon: Link2, title: "Galera aposta pelo link", desc: "Cada pessoa escolhe a hora e o minuto com o nome dela. A aposta é única e definitiva: uma vez confirmada, não dá mais pra mudar. Sem bagunça." },
              { n: "3", icon: Trophy, title: "Pedro (talvez) chega", desc: "Quando ele aparecer — ou não — o organizador revela o horário real e o app coroa quem chegou mais perto. Glória eterna no grupo." },
            ].map((s) => (
              <div key={s.n} className="relative rounded-3xl border-2 border-stone-900 bg-amber-50 p-5 hard-shadow-sm">
                <span className="font-display absolute -top-4 right-4 grid h-9 w-9 place-items-center rounded-full border-2 border-stone-900 bg-amber-400 text-base font-black">{s.n}</span>
                <s.icon className="h-8 w-8 text-stone-900" />
                <h3 className="font-display mt-3 text-lg font-black">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EVENTS FEED */}
      <section id="eventos" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-black tracking-[0.18em] text-red-600"><span className="h-2 w-2 rounded-full bg-red-500" /> AO VIVO AGORA</p>
            <h2 className="font-display mt-1 text-3xl font-black tracking-tight sm:text-4xl">Bolões da comunidade</h2>
            <p className="mt-1 text-sm text-stone-600">Entre em qualquer um e deixe seu palpite. Atualiza sozinho a cada poucos segundos.</p>
          </div>
          <button onClick={loadEvents} className="inline-flex items-center gap-1.5 rounded-full border-2 border-stone-900 bg-white px-3 py-2 text-xs font-black hard-shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] transition">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </button>
        </div>

        {loadingEvents ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="h-44 animate-pulse rounded-3xl border-2 border-stone-200 bg-white" />)}</div>
        ) : events.length === 0 ? (
          <div className="mt-6 rounded-3xl border-2 border-dashed border-stone-400 bg-white p-10 text-center">
            <Ghost className="mx-auto h-10 w-10 text-stone-400" />
            <p className="font-display mt-3 text-xl font-black">Nenhum bolão ainda… igual ao Pedro: não apareceu.</p>
            <p className="mt-1 text-sm text-stone-500">Seja a primeira pessoa a criar um evento aqui em cima.</p>
            <a href="#criar" className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-stone-900 bg-amber-400 px-4 py-2.5 text-sm font-black hard-shadow-sm">Criar o primeiro <ArrowRight className="h-4 w-4" /></a>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => {
              const pct = Math.round(((ev.voteCount || 0) / maxVotes) * 100);
              return (
                <Link key={ev.id} href={`/evento/${ev.slug}`} className="group flex flex-col rounded-3xl border-2 border-stone-900 bg-white p-5 hard-shadow transition hover:-translate-y-1 hover:bg-amber-100">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide ${ev.status === "open" ? "bg-emerald-400 text-stone-900" : "bg-stone-900 text-white"}`}>
                      {ev.status === "open" ? "● VOTAÇÃO ABERTA" : ev.actualSlotIndex !== null ? "RESULTADO REVELADO" : "VOTAÇÃO FECHADA"}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-black text-stone-700"><Users className="h-3.5 w-3.5" /> {ev.voteCount} {ev.voteCount === 1 ? "aposta" : "apostas"}</span>
                  </div>
                  <h3 className="font-display mt-3 line-clamp-2 text-xl font-black leading-tight">{ev.name}</h3>
                  {ev.description && <p className="mt-1 line-clamp-2 text-sm text-stone-600">{ev.description}</p>}
                  <div className="mt-3 space-y-1.5 text-xs font-semibold text-stone-600">
                    <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {formatDateBR(ev.eventDate)} às {ev.startTime} {ev.location ? `• ${ev.location}` : ""}</p>
                    <p className="flex items-center gap-1.5"><Crown className="h-3.5 w-3.5" /> por {ev.organizerName}</p>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] font-black text-stone-500"><span>MOVIMENTO DO BOLÃO</span><span>{pct}%</span></div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full border border-stone-900 bg-amber-100"><div className="h-full bg-amber-500 transition-all" style={{ width: `${Math.max(6, pct)}%` }} /></div>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 pt-1 font-display text-sm font-black">APOSTAR AGORA <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                </Link>
              );
            })}
          </div>
        )}
        {openEvents.length > 0 && <p className="mt-4 text-center text-xs font-semibold text-stone-500">{openEvents.length} bolão(ões) aberto(s) esperando seu palpite. Não faça igual ao Pedro: não demore.</p>}
      </section>

      {/* FOOTER */}
      <footer className="border-t-2 border-stone-900 bg-stone-900 py-10 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="font-display text-xl font-black">PEDRO DIAS: <span className="text-amber-400">VAI CHEGAR QUANDO?</span></p>
              <p className="mt-1 max-w-md text-sm text-stone-400">Feito com carinho (e anos de espera) pela comunidade que já aprendeu: evento às 22h, Pedro às 00h — com sorte.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="#criar" className="rounded-full border-2 border-amber-400 bg-amber-400 px-4 py-2 text-xs font-black text-stone-900">Criar evento</a>
              <a href="#eventos" className="rounded-full border-2 border-white px-4 py-2 text-xs font-black">Ver bolões</a>
            </div>
          </div>
          <p className="mt-8 border-t border-stone-700 pt-4 text-[11px] text-stone-500">Nenhum Pedro foi pontual durante a produção deste site. • Os horários são gerados de 30 em 30 min por 4 horas a partir do horário oficial.</p>
        </div>
      </footer>
    </div>
  );
}
