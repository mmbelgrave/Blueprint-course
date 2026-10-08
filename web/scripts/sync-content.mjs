// Copies the single sources of content (../step1-content.json, ../step2-content.json,
// ../step3-content.json)
// into the app. Runs automatically before `npm run dev` and `npm run build`.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

for (const name of [
  "step1-content.json",
  "step2-content.json",
  "step3-content.json",
  "journey.json",
  "app-guide.json",
  "access.json",
  "modules.json",
]) {
  const source = new URL(`../../${name}`, import.meta.url);
  const target = new URL(`../src/content/${name}`, import.meta.url);
  if (!existsSync(source)) {
    console.warn(`sync-content: ../${name} not found, keeping the existing copy.`);
    continue;
  }
  mkdirSync(new URL(".", target), { recursive: true });
  copyFileSync(source, target);
  console.log(`sync-content: ${name} copied.`);
}

// The browser gets the shape of the workbook, never the words (review round 4).
// Generated from the same source files, so it can never drift from them.
execFileSync(process.execPath, [join(here, "../../content-build/make-spine.mjs"), join(here, "../..")], {
  stdio: "inherit",
});
