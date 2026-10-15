/*
 * Holds together.json against the content: every page that can be answered has
 * to say whether a household answers it together or each person alone, and no
 * line may name a page that does not exist. A new exercise therefore cannot
 * slip in without that decision being made.
 *
 * Run: node content-build/check-together.mjs
 */
import { readFileSync } from "node:fs";

const read = (name) => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), "utf8"));

const together = read("together.json");
const KINDS = Object.keys(together.kinds);

const pages = new Map(); // id -> title
const fieldIds = new Map(); // id -> Set of field ids

const collectFields = (node, into) => {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((n) => collectFields(n, into));
  if (typeof node.id === "string" && typeof node.type === "string" && !node.exercises) into.add(node.id);
  Object.values(node).forEach((n) => collectFields(n, into));
};

for (const step of [1, 2, 3]) {
  const content = read(`step${step}-content.json`);
  for (const part of content.parts) {
    for (const exercise of part.exercises ?? []) {
      pages.set(exercise.id, exercise.title);
      const into = new Set();
      collectFields(exercise.fields ?? exercise, into);
      fieldIds.set(exercise.id, into);
    }
    if (part.summary) {
      pages.set(part.summary.id, part.summary.title);
      const into = new Set();
      collectFields(part.summary, into);
      fieldIds.set(part.summary.id, into);
    }
  }
}

const problems = [];

for (const [id, title] of pages) {
  const kind = together.pages[id];
  if (!kind) problems.push(`${id} (${title}) is not in together.json`);
  else if (!KINDS.includes(kind)) problems.push(`${id} says "${kind}", which is not one of ${KINDS.join(", ")}`);
  else if (kind === "read" && fieldIds.get(id).size > 0)
    problems.push(`${id} is marked read, but it has ${fieldIds.get(id).size} field(s) to answer`);
}

for (const id of Object.keys(together.pages)) {
  if (!pages.has(id)) problems.push(`together.json names ${id}, which is not a page`);
}

for (const [id, fields] of Object.entries(together.mine_fields)) {
  if (id === "note") continue;
  if (together.pages[id] !== "ours") problems.push(`mine_fields names ${id}, which is not a shared page`);
  for (const field of fields) {
    if (!fieldIds.get(id)?.has(field)) problems.push(`mine_fields: ${id} has no field called ${field}`);
  }
}

for (const list of [together.private_allowed.pages, together.agree_after.pages]) {
  for (const id of list) {
    if (together.pages[id] !== "mine") problems.push(`${id} is listed as personal-only, but it is "${together.pages[id]}"`);
  }
}

const counts = Object.values(together.pages).reduce((all, kind) => ({ ...all, [kind]: (all[kind] ?? 0) + 1 }), {});

if (problems.length) {
  console.error(`together.json does not match the content:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(
  `together.json: ${pages.size} pages, all accounted for (${Object.entries(counts)
    .map(([k, n]) => `${n} ${k}`)
    .join(", ")}).`,
);
