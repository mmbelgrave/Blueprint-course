/*
 * Does this build hand the workbook to people who have not bought it?
 *
 * Review round 4 (R4-1) found the whole of Step 1 and Step 3 inside a public
 * JavaScript chunk, because a client component imported the content file.
 * Round 5 (R5-5) found the old chunk still being served from an earlier
 * deployment. The code was fixed both times; nothing stopped it coming back.
 *
 * This reads real sentences out of the content files and looks for them in
 * everything the browser can download: .next/static. A hit means the words
 * somebody paid for are in a file anybody can fetch without signing in.
 *
 * It runs after every build, including Vercel's, so a leak fails the deploy
 * rather than waiting for the next review. Page titles are not checked: the
 * spine (which pages exist, and what they are called) is public by design.
 *
 * Run on its own: node scripts/check-public-bundle.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const web = fileURLToPath(new URL("..", import.meta.url));
const contentDir = join(web, "src", "content");
const staticDir = join(web, process.env.NEXT_DIST_DIR_PREVIEW ? ".next-preview" : ".next", "static");

/** Long passages of teaching text: intros, and the worked examples. */
function passages() {
  const found = [];
  for (const file of ["step1-content.json", "step2-content.json", "step3-content.json"]) {
    const path = join(contentDir, file);
    if (!existsSync(path)) continue;
    const content = JSON.parse(readFileSync(path, "utf8"));
    (function walk(node) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node.intro)) found.push(...node.intro);
      if (node.example && typeof node.example.text === "string") found.push(node.example.text);
      if (typeof node.prompt === "string") found.push(node.prompt);
      for (const key of Object.keys(node)) walk(node[key]);
    })(content);
  }
  // Long enough to be unmistakable, and taken from across the three steps.
  const long = found.filter((t) => typeof t === "string" && t.length > 90);
  const every = Math.max(1, Math.floor(long.length / 25));
  return long.filter((_, i) => i % every === 0).slice(0, 25);
}

function filesUnder(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else if (/\.(js|json|txt)$/.test(entry)) out.push(path);
  }
  return out;
}

if (!existsSync(staticDir)) {
  console.log("public bundle: nothing built yet, nothing to check.");
  process.exit(0);
}

const texts = passages();
if (texts.length === 0) {
  console.error("public bundle: no passages found in the content files. Check the content build.");
  process.exit(1);
}

const files = filesUnder(staticDir);
const leaks = [];
for (const file of files) {
  const body = readFileSync(file, "utf8");
  for (const text of texts) {
    // The first words only: a bundler may re-escape quotes further along.
    const probe = text.slice(0, 60);
    if (body.includes(probe)) leaks.push({ file: file.slice(web.length), probe });
  }
}

if (leaks.length > 0) {
  console.error(`\npublic bundle: the workbook is in ${leaks.length} public file(s).\n`);
  for (const leak of leaks.slice(0, 5)) console.error(`  ${leak.file}\n    "${leak.probe}…"`);
  console.error(
    "\nThe words people pay for must stay behind /api/content. Find the client\n" +
      "component importing src/content/step*-content.json, and read it through\n" +
      "lib/content-server.ts instead.\n",
  );
  process.exit(1);
}

console.log(`public bundle: clean. ${texts.length} passages checked against ${files.length} public files.`);
