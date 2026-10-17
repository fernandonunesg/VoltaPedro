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
