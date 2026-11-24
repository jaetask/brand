import { ENTITY_COLOURS, ENTITY_ICONS, type EntityIconName } from "@shared/entity-appearance";
import {
  IconBolt,
  IconBook,
  IconBuildingStore,
  IconBulb,
  IconChartBar,
  IconCode,
  IconCoffee,
  IconFlag,
  IconHeart,
  IconPalette,
  IconRocket,
  IconSpeakerphone,
  IconStar,
  IconTarget,
  IconUser,
  IconWorld,
  type Icon,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ICONS: Record<EntityIconName, Icon> = {
  "building-store": IconBuildingStore,
  user: IconUser,
  rocket: IconRocket,
  bolt: IconBolt,
  star: IconStar,
  heart: IconHeart,
  bulb: IconBulb,
  target: IconTarget,
  flag: IconFlag,
  code: IconCode,
  palette: IconPalette,
  book: IconBook,
  world: IconWorld,
  chart: IconChartBar,
  speakerphone: IconSpeakerphone,
  coffee: IconCoffee,
};

export function EntityIcon({
  icon,
  colour,
  size = 16,
  className,
}: {
  icon: string;
  colour: string;
  size?: number;
  className?: string;
}) {
  const Glyph = ICONS[icon as EntityIconName] ?? IconBuildingStore;
  return (
    <Glyph
      size={size}
      stroke={1.8}
      style={{ color: colour }}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    />
  );
}

export function AppearancePicker({
  icon,
  colour,
  onChange,
  idp,
}: {
  icon: string;
  colour: string;
  onChange: (v: { icon: string; colour: string }) => void;
  idp: string;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label id={`${idp}-icon-label`}>Icon</Label>
        <div
          role="radiogroup"
          aria-labelledby={`${idp}-icon-label`}
          className="flex flex-wrap gap-1"
        >
          {ENTITY_ICONS.map((name) => (
            <Button
              key={name}
              type="button"
              size="icon"
              variant={icon === name ? "secondary" : "ghost"}
              role="radio"
              aria-checked={icon === name}
              aria-label={name.replace("-", " ")}
              title={name.replace("-", " ")}
              onClick={() => onChange({ icon: name, colour })}
              className={cn("size-8", icon === name && "ring-2 ring-ring")}
            >
              <EntityIcon icon={name} colour={colour} />
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label id={`${idp}-colour-label`}>Colour</Label>
        <div
          role="radiogroup"
          aria-labelledby={`${idp}-colour-label`}
          className="flex flex-wrap gap-1.5"
        >
          {ENTITY_COLOURS.map((c) => (
            <Button
              key={c.value}
              type="button"
              size="icon"
              variant="ghost"
              role="radio"
              aria-checked={colour.toLowerCase() === c.value}
              aria-label={c.name}
              title={c.name}
              onClick={() => onChange({ icon, colour: c.value })}
              className={cn(
                "size-7 rounded-full p-0",
                colour.toLowerCase() === c.value && "ring-2 ring-ring ring-offset-2",
              )}
            >
              <span className="block size-5 rounded-full" style={{ background: c.value }} />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
