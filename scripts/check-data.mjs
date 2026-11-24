#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const DATA = /(^|\/)data\/|\.(db|sqlite|sqlite3)(-[a-z]+)?$|(^|\/)pglite\/|(^|\/)\.env($|\.)/;
const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
const leaks = tracked.filter((file) => DATA.test(file) && file !== ".env.example");
if (leaks.length) {
  console.error("Brand is open source; these tracked files look like data or secrets:");
  for (const file of leaks) console.error(`  ${file}`);
  process.exit(1);
}
console.log(`check:data: ${tracked.length} tracked files, none are data.`);
