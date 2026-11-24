export const ENTITY_ICONS = [
  "building-store",
  "user",
  "rocket",
  "bolt",
  "star",
  "heart",
  "bulb",
  "target",
  "flag",
  "code",
  "palette",
  "book",
  "world",
  "chart",
  "speakerphone",
  "coffee",
] as const;
export type EntityIconName = (typeof ENTITY_ICONS)[number];

export const ENTITY_COLOURS = [
  { name: "Slate", value: "#64748b" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Cyan", value: "#0891b2" },
  { name: "Green", value: "#16a34a" },
  { name: "Yellow", value: "#ca8a04" },
  { name: "Orange", value: "#ea580c" },
  { name: "Rose", value: "#e11d48" },
  { name: "Violet", value: "#7c3aed" },
] as const;

export function defaultAppearance(id: string): {
  icon: EntityIconName;
  colour: string;
} {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    icon: "building-store",
    colour: ENTITY_COLOURS[h % ENTITY_COLOURS.length].value,
  };
}
