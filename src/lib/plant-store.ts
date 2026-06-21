import { useEffect, useState } from "react";

export type PlantType = "Aloe" | "Jade" | "Pothos";

export const PLANT_TYPES: PlantType[] = ["Aloe", "Jade", "Pothos"];

export const WATER_INTERVAL_DAYS: Record<PlantType, number> = {
  Aloe: 14,
  Jade: 14,
  Pothos: 7,
};

export const CARE_TIPS: Record<PlantType, string> = {
  Aloe: "Loves bright, indirect sun. Let soil fully dry between waterings.",
  Jade: "Treat like a succulent. Drench, then leave alone for two weeks.",
  Pothos: "Tolerates low light. Water when the top inch of soil feels dry.",
};

export const PLANT_EMOJI: Record<PlantType, string> = {
  Aloe: "🌵",
  Jade: "🪴",
  Pothos: "🌿",
};

export interface Plant {
  id: string;
  nickname: string;
  type: PlantType;
  createdAt: string;
  lastWateredAt: string | null;
}

export interface LogEntry {
  id: string;
  plantId: string;
  plantNickname: string;
  plantType: PlantType;
  wateredAt: string;
  action: "watered";
}

export interface AppState {
  plants: Plant[];
  log: LogEntry[];
  coins: number;
  streak: number;
  lastWaterDay: string | null; // YYYY-MM-DD for streak math
}

const KEY = "plant-kingdom-state-v1";

const defaultState: AppState = {
  plants: [],
  log: [],
  coins: 0,
  streak: 0,
  lastWaterDay: null,
};

function load(): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

function save(s: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

let cache: AppState | null = null;
const listeners = new Set<() => void>();

function getState(): AppState {
  if (cache === null) cache = load();
  return cache;
}
function setState(updater: (s: AppState) => AppState) {
  cache = updater(getState());
  save(cache);
  listeners.forEach((l) => l());
}

export function useAppState() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return getState();
}

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export const actions = {
  addPlant(nickname: string, type: PlantType) {
    const p: Plant = {
      id: crypto.randomUUID(),
      nickname: nickname.trim() || `${type} Buddy`,
      type,
      createdAt: new Date().toISOString(),
      lastWateredAt: null,
    };
    setState((s) => ({ ...s, plants: [...s.plants, p] }));
    return p;
  },
  removePlant(id: string) {
    setState((s) => ({
      ...s,
      plants: s.plants.filter((p) => p.id !== id),
      log: s.log.filter((l) => l.plantId !== id),
    }));
  },
  waterPlant(id: string) {
    const now = new Date();
    const nowIso = now.toISOString();
    const today = todayKey(now);
    let entry: LogEntry | null = null;
    setState((s) => {
      const plant = s.plants.find((p) => p.id === id);
      if (!plant) return s;
      entry = {
        id: crypto.randomUUID(),
        plantId: plant.id,
        plantNickname: plant.nickname,
        plantType: plant.type,
        wateredAt: nowIso,
        action: "watered",
      };
      const plants = s.plants.map((p) =>
        p.id === id ? { ...p, lastWateredAt: nowIso } : p,
      );
      // streak: increment if last water was yesterday or today; reset if older
      let streak = s.streak;
      if (s.lastWaterDay === today) {
        // same day, no change
      } else if (s.lastWaterDay) {
        const last = new Date(s.lastWaterDay + "T00:00:00");
        const diff = Math.round((now.getTime() - last.getTime()) / 86_400_000);
        streak = diff === 1 ? streak + 1 : 1;
      } else {
        streak = 1;
      }
      return {
        ...s,
        plants,
        log: [entry!, ...s.log],
        coins: s.coins + 1,
        streak,
        lastWaterDay: today,
      };
    });
    return entry;
  },
  deleteLog(id: string) {
    setState((s) => ({ ...s, log: s.log.filter((l) => l.id !== id) }));
  },
  resetAll() {
    setState(() => defaultState);
  },
};

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function nextWaterDate(p: Plant): Date {
  const base = p.lastWateredAt ? new Date(p.lastWateredAt) : new Date();
  const d = new Date(base);
  d.setDate(d.getDate() + WATER_INTERVAL_DAYS[p.type]);
  return d;
}

export function daysUntilNext(p: Plant): number {
  return Math.ceil((nextWaterDate(p).getTime() - Date.now()) / 86_400_000);
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  icon: string;
}

export function computeBadges(s: AppState): Badge[] {
  const totalWaters = s.log.length;
  return [
    {
      id: "green-thumb",
      name: "Green Thumb",
      description: "Water 5 times",
      unlocked: totalWaters >= 5,
      icon: "🌱",
    },
    {
      id: "water-hero",
      name: "Water Hero",
      description: "Reach a 3-day streak",
      unlocked: s.streak >= 3,
      icon: "💧",
    },
    {
      id: "plant-champion",
      name: "Plant Champion",
      description: "Earn 25 coins",
      unlocked: s.coins >= 25,
      icon: "🏆",
    },
  ];
}

// Build a downloadable .ics file (works without OAuth — opens in any calendar
// including Google Calendar via "Import").
export function buildIcs(plant: Plant): string {
  const next = nextWaterDate(plant);
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = next.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const endDate = new Date(next.getTime() + 30 * 60_000);
  const end = endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const uid = `${plant.id}-${start}@plant-kingdom`;
  const summary = `Water ${plant.nickname} (${plant.type})`;
  const desc = `${CARE_TIPS[plant.type]} Plant Kingdom Tracker reminder.`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Plant Kingdom//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${desc}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(plant: Plant) {
  const ics = buildIcs(plant);
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `water-${plant.nickname.replace(/\s+/g, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function googleCalendarUrl(plant: Plant): string {
  const next = nextWaterDate(plant);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = new Date(next.getTime() + 30 * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Water ${plant.nickname} (${plant.type})`,
    dates: `${fmt(next)}/${fmt(end)}`,
    details: CARE_TIPS[plant.type],
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Simple WebAudio chiptune blips. No assets needed.
let audioCtx: AudioContext | null = null;
function ctx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}
function blip(freq: number, dur: number, type: OscillatorType = "square", when = 0) {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
export const sfx = {
  coin() {
    blip(988, 0.08, "square", 0);
    blip(1318, 0.18, "square", 0.06);
  },
  jump() {
    blip(523, 0.06, "square", 0);
    blip(784, 0.08, "square", 0.05);
  },
  powerup() {
    [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.1, "triangle", i * 0.07));
  },
};