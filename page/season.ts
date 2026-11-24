import type { Season } from "./api.js";

export const SEASON_BANDS = [
  { from: 1, to: 30, label: "Proof sprint" },
  { from: 31, to: 60, label: "Your person + Association" },
  { from: 61, to: 90, label: "Product + Belt" },
] as const;

export const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());

const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);

export function seasonDay(s: Pick<Season, "start" | "end">, on = today()) {
  const t = dayNumber(on);
  const start = dayNumber(s.start);
  const length = dayNumber(s.end) - start + 1;
  return {
    length,
    day: t >= start ? Math.min(t - start + 1, length) : null,
    startsIn: Math.max(0, start - t),
  };
}

export function currentSeason(seasons: Season[], on = today()): Season | undefined {
  return [...seasons].reverse().find((s) => s.start <= on) ?? seasons[0];
}

export function addDays(iso: string, days: number) {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function checkIns(s: Pick<Season, "start" | "end">, weekday: string): string[] {
  const want = WEEKDAYS.indexOf(weekday.trim().toLowerCase());
  if (want < 0 || !s.start || !s.end) return [];
  const out: string[] = [];
  for (let d = s.start; d <= s.end; d = addDays(d, 1)) {
    if (new Date(`${d}T00:00:00Z`).getUTCDay() === want) out.push(d);
  }
  return out;
}
