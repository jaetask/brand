import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createBrand } from "./app.js";

const env = process.env;
const dataDir = env.DATA_DIR ?? "data";
mkdirSync(dataDir, { recursive: true });

const app = await createBrand({
  file: join(dataDir, "app.db"),
  brands: join(dataDir, "pglite"),
  images: join(dataDir, "brand-plan-images"),
  connect: (env.KIT_CONNECT ?? "").split(",").filter(Boolean),
  page: fileURLToPath(new URL("../public", import.meta.url)),
  skill: fileURLToPath(new URL("../skills/brand/SKILL.md", import.meta.url)),
});

const url = await app.listen(Number(env.PORT ?? 8093), env.HOST ?? "127.0.0.1");
console.log(`Brand runs at ${url}. Agents connect to ${url}/mcp.`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
