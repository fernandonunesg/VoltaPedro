export type SlotDef = {
  slotIndex: number;
  slotMinutes: number;
  label: string;
  title: string;
  description: string;
  badge: string;
};

export const SLOTS: SlotDef[] = [
  { slotIndex: 0, slotMinutes: 0, label: "No horário", title: "Pontual?! Milagre", description: "Pedro chega no horário combinado. Filmam, porque ninguém vai acreditar.", badge: "MILAGRE" },
  { slotIndex: 1, slotMinutes: 30, label: "+30 min", title: "Só aquecendo", description: "Trânsito, elevador, cachorro, Wi-Fi… o combo completo de desculpas leves.", badge: "LEVE" },
  { slotIndex: 2, slotMinutes: 60, label: "+1h", title: "Clássico Pedro", description: "Um café, dois áudios de 7 minutos e um 'tô saindo' totalmente fictício.", badge: "CLÁSSICO" },
  { slotIndex: 3, slotMinutes: 90, label: "+1h30", title: "Modo avião", description: "Visualizou e sumiu. Está 'a 5 minutinhos' há pelo menos 40.", badge: "SUMIU" },
  { slotIndex: 4, slotMinutes: 120, label: "+2h", title: "Lenda urbana", description: "Metade do rolê já acabou e ele ainda está 'a caminho'. Aham.", badge: "LENDA" },
  { slotIndex: 5, slotMinutes: 150, label: "+2h30", title: "Outro fuso horário", description: "O despertador falhou. O Pedro vive num fuso só dele.", badge: "JET LAG" },
  { slotIndex: 6, slotMinutes: 180, label: "+3h", title: "Chega com comida", description: "Aparece como se nada tivesse acontecido, ainda trazendo um lanche.", badge: "PLOT TWIST" },
  { slotIndex: 7, slotMinutes: 210, label: "+3h30", title: "Chefe final", description: "O evento já virou after, já tem história pra contar… e o Pedro é só um rumor.", badge: "BOSS" },
  { slotIndex: 8, slotMinutes: 240, label: "+4h", title: "Arquivo X", description: "Se chegar agora, merece troféu, faixa na entrada e documentário.", badge: "ARQUIVO X" },
  { slotIndex: 9, slotMinutes: 999, label: "Não aparece", title: "Virou lenda", description: "Pedro não vem. Só será visto no próximo evento — atrasado, claro.", badge: "FANTASMA" },
];

// ---- Aposta por tempo livre (0 a 8h, passo de 5 min) ----
export const MAX_DELAY_MINUTES = 480; // 8h
export const STEP_MINUTES = 5;
export const NO_SHOW_MINUTES = 999;

export type Persona = { label: string; title: string; description: string; badge: string };

const NO_SHOW_PERSONA: Persona = { label: "Não aparece", title: "Virou lenda", description: "Pedro não vem. Só será visto no próximo evento — atrasado, claro.", badge: "FANTASMA" };

// Apelidos ancorados a cada 30 min (mantém compatível com os cards antigos de 0 a 4h).
const PERSONA_BY_MINUTE: Record<number, Persona> = {
  0: { label: "No horário", title: "Pontual?! Milagre", description: "Pedro chega no horário combinado. Filmam, porque ninguém vai acreditar.", badge: "MILAGRE" },
  30: { label: "+30 min", title: "Só aquecendo", description: "Trânsito, elevador, cachorro, Wi-Fi… o combo clássico de desculpas leves.", badge: "LEVE" },
  60: { label: "+1h", title: "Clássico Pedro", description: "Um café, dois áudios de 7 minutos e um 'tô saindo' totalmente fictício.", badge: "CLÁSSICO" },
  90: { label: "+1h30", title: "Modo avião", description: "Visualizou e sumiu. Está 'a 5 minutinhos' há pelo menos 40.", badge: "SUMIU" },
  120: { label: "+2h", title: "Lenda urbana", description: "Metade do rolê já acabou e ele ainda está 'a caminho'. Aham.", badge: "LENDA" },
  150: { label: "+2h30", title: "Outro fuso horário", description: "O despertador falhou. O Pedro vive num fuso só dele.", badge: "JET LAG" },
  180: { label: "+3h", title: "Chega com comida", description: "Aparece como se nada tivesse acontecido, ainda trazendo um lanche.", badge: "PLOT TWIST" },
  210: { label: "+3h30", title: "Chefe final", description: "O evento já virou after, já tem história pra contar… e o Pedro é só um rumor.", badge: "BOSS" },
  240: { label: "+4h", title: "Arquivo X", description: "Se chegar agora, merece troféu, faixa na entrada e documentário.", badge: "ARQUIVO X" },
  270: { label: "+4h30", title: "Empurrando o limite", description: "Já era pro bar ter fechado. O Pedro segue 'a caminho', agora por pura teimosia.", badge: "LIMITE" },
  300: { label: "+5h", title: "Cartaz de desaparecidos", description: "A última aparição do Pedro foi um 'chego em 10 min' no grupo. Investigações em curso.", badge: "PROCURA-SE" },
  330: { label: "+5h30", title: "Escavação arqueológica", description: "Achar o Pedro já exige equipe de campo, mapa e financiamento coletivo.", badge: "ARQUEOLOGIA" },
  360: { label: "+6h", title: "Novo fuso-horário", description: "O atraso do Pedro já pode ser usado como unidade oficial de medida de tempo.", badge: "NOVA UNIDADE" },
  390: { label: "+6h30", title: "Patrimônio imaterial", description: "A essa altura, o atraso virou bem cultural tombado. Não se discute, se respeita.", badge: "PATRIMÔNIO" },
  420: { label: "+7h", title: "Arquivo confidencial", description: "Documentos sobre o paradeiro do Pedro foram classificados como segredo de estado.", badge: "SIGILO" },
  450: { label: "+7h30", title: "Mal chegou de ontem", description: "Se aparecer agora, veio direto do evento anterior — provavelmente ainda trajado.", badge: "LENDÁRIO" },
  480: { label: "+8h", title: "Virou folclore", description: "A 8h de atraso, o Pedro transcende o rolê e entra pro folclore nacional.", badge: "MITOLÓGICO" },
};

// Arredonda para a faixa de 30 min mais próxima (limite de 8h).
export function bucketOf(minutes: number): number {
  if (minutes >= NO_SHOW_MINUTES) return NO_SHOW_MINUTES;
  return Math.min(MAX_DELAY_MINUTES, Math.max(0, Math.round(minutes / 30) * 30));
}

export function personaForMinutes(minutes: number): Persona {
  if (minutes >= NO_SHOW_MINUTES) return NO_SHOW_PERSONA;
  return PERSONA_BY_MINUTE[bucketOf(minutes)] ?? NO_SHOW_PERSONA;
}

export function minutesToLabel(minutes: number): string {
  if (minutes >= NO_SHOW_MINUTES) return "Não vem";
  if (minutes === 0) return "no horário";
  if (minutes < 60) return `+${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `+${h}h${String(m).padStart(2, "0")}` : `+${h}h`;
}

export function clampDelay(minutes: number): number {
  return Math.min(MAX_DELAY_MINUTES, Math.max(0, minutes));
}

export function addMinutesToTime(startTime: string, add: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = ((h * 60 + m + add) % (24 * 60) + 24 * 60) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function formatSlotTime(startTime: string, slot: SlotDef): string {
  if (slot.slotMinutes === 999) return "—";
  return addMinutesToTime(startTime, slot.slotMinutes);
}

export function slotByIndex(i: number): SlotDef {
  return SLOTS.find((s) => s.slotIndex === i) ?? SLOTS[9];
}

export const FUNNY_QUOTES = [
  "Pedro está a 5 minutos há 2 horas.",
  "O fuso horário do Pedro tem nome: Horário de Pedro.",
  "Se o Pedro falar 'tô chegando', sente e peça outra rodada.",
  "'Saindo de casa' = ainda no banho, segundo estudos.",
  "Waze do Pedro: recalculando… desde ontem.",
];

export const EXCUSE_GENERATOR = [
  "O Uber cancelou 3 vezes (fonte: confia)",
  "Trânsito na rua que não tem trânsito",
  "Esqueceu a carteira. Depois a chave. Depois o evento.",
  "Cochilo de 15 min que durou 2h30",
  "Celular descarregou bem na hora de sair",
  "Estava pronto, mas voltou pra trocar de roupa",
  "O elevador parou em todos os andares do universo",
];
