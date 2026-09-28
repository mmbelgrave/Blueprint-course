// Compares a content JSON against the workbook text it came from, both ways:
//   forward  — every sentence in the workbook appears in the app content
//   reverse  — every sentence in the app content appears in the workbook
// Anything listed is either a real difference or a deliberate change.
//
//   node content-build/check-content.mjs step1-content.json ".../_build/step1-v19.txt"
import { readFileSync } from "node:fs";

const [jsonPath, textPath] = process.argv.slice(2);

/** Same shape for both sides: lower case, plain quotes, no double spaces. */
const norm = (s) =>
  s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/[  ]/g, " ")
    .replace(/[☐☑✓]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

/** Sentences worth comparing: long enough to be meaningful. */
function sentences(text) {
  return text
    .split(/(?<=[.!?:])\s+|\n/)
    .map((s) => norm(s).replace(/^[-–—•|\s]+|[\s|]+$/g, ""))
    .filter((s) => s.split(" ").length >= 4);
}

/** Notes for developers are not workbook text, so they stay out of the comparison. */
const SKIP_KEYS = new Set(["schema_notes", "field_types", "source", "source_note", "version", "app_note", "id", "type", "status", "kind", "format", "formula", "condition"]);

const strings = (node, out = []) => {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => strings(n, out));
  else if (node && typeof node === "object")
    for (const [k, v] of Object.entries(node)) if (!SKIP_KEYS.has(k)) strings(v, out);
  return out;
};

/** The workbook writes box labels inline ("Good to know: …"); the app stores the text only. */
const stripLabels = (s) =>
  s
    .replace(/^(good to know|watch out|my story|talk about it|a friendly challenge|note|tip|result|now you|go deeper( \(optional\))?)\s*[:.]\s*/i, "")
    .replace(/^made-up example \(([^)]*)\)\s*:\s*/i, "");

const json = JSON.parse(readFileSync(jsonPath, "utf8"));
const jsonText = strings(json).map(stripLabels).join("\n");
// Table cells become their own lines: the app stores each cell separately.
const docText = readFileSync(textPath, "utf8")
  .split("\n")
  .flatMap((l) => {
    const line = l.replace(/^\[[^\]]+\]\s*/, "");
    if (!line.startsWith("|")) return [stripLabels(line)];
    return line.replace(/^\|\s*|\s*\|$/g, "").split(/\s*\|\s*/).map(stripLabels);
  })
  .join("\n");

const jsonBlob = norm(jsonText);
const docBlob = norm(docText);

const missing = sentences(docText).filter((s) => !jsonBlob.includes(s));
const extra = sentences(jsonText).filter((s) => !docBlob.includes(s));

const show = (label, list, limit = 40) => {
  console.log(`\n=== ${label}: ${list.length} ===`);
  list.slice(0, limit).forEach((s) => console.log("  · " + (s.length > 150 ? s.slice(0, 150) + "…" : s)));
  if (list.length > limit) console.log(`  … and ${list.length - limit} more`);
};

console.log(`${jsonPath}  vs  ${textPath}`);
console.log(`workbook sentences: ${sentences(docText).length} · app sentences: ${sentences(jsonText).length}`);
show("IN THE WORKBOOK, NOT IN THE APP", missing);
show("IN THE APP, NOT IN THE WORKBOOK", extra);
