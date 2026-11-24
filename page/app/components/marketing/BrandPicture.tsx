import type { Entity } from "@shared/marketing";
import { useRef, type ReactNode } from "react";
import { toast } from "sonner";

import { useWrite } from "@/components/marketing/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function BrandPicture({
  entity,
  size,
  fallback,
}: {
  entity: Pick<Entity, "name" | "image">;
  size: number;
  fallback: ReactNode;
}) {
  if (!entity.image) return <>{fallback}</>;
  return (
    <img
      src={entity.image}
      alt=""
      aria-hidden
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover"
    />
  );
}

const MAX_SIDE = 256;

export async function toDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const out = Math.min(MAX_SIDE, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that image.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out, out);
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    out,
    out,
  );
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.88);
}

export async function toImageDataUrl(file: File, maxSide = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that image.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function BrandPictureUpload({
  entity,
  size,
  fallback,
}: {
  entity: Entity;
  size: number;
  fallback: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const save = useWrite<Entity>("save-entity", { success: "Picture saved" });
  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      const image = await toDataUrl(file);
      await save.run({ id: entity.id, expectedVersion: entity.version, image });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that image.");
    }
  };
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => input.current?.click()}
        disabled={entity.archived || save.busy}
        title="Upload a picture"
        aria-label={`Upload a picture for ${entity.name}`}
        className={cn(
          "grid shrink-0 place-items-center rounded-full p-0 hover:bg-transparent hover:opacity-80 disabled:opacity-60",
        )}
        style={{ width: size, height: size }}
      >
        <BrandPicture entity={entity} size={size} fallback={fallback} />
      </Button>
      <Input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );
}
