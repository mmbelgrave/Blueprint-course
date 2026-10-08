/*
 * The spine: what the browser may know about the workbook without being able
 * to read it (review round 4, finding 1).
 *
 * The words are the product, so they never go into the browser bundle. What
 * does go in is the shape: which steps exist, which parts, which pages, in
 * what order, how many, what kind of field sits where. Navigation, the page
 * counter, Modules and the progress bars all need that, and none of it is
 * worth anything to somebody who has not bought the course.
 *
 * Titles stay. They are on the sales page already, and a list of page numbers
 * with no names would be unusable to the person who has paid.
 *
 *   node content-build/make-spine.mjs <project dir>
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const dir = process.argv[2] ?? ".";

/** A field, with everything a layout needs and nothing anyone could read. */
const boneOfField = (f) => ({
  id: f.id,
  type: f.type,
  ...(f.optional ? { optional: true } : {}),
  // Rows and columns decide the shape of a table on screen, and the keys that
  // answers are stored under. The labels in them are text, so they stay behind.
  ...(f.rows ? { rows: f.rows } : {}),
  ...(f.row_labels ? { row_count: f.row_labels.length } : {}),
  ...(f.columns ? { columns: f.columns.map((c) => ({ id: c.id, kind: c.kind })) } : {}),
  ...(f.count ? { count: f.count } : {}),
});

const fieldsOf = (ex) => [...(ex.start_here?.fields ?? []), ...(ex.go_deeper?.fields ?? [])];

const boneOfExercise = (ex, kind) => ({
  id: ex.id,
  ...(ex.number !== undefined ? { number: ex.number } : {}),
  title: ex.title,
  ...(kind ? { kind } : {}),
  ...(ex.optional ? { optional: true } : {}),
  fields: fieldsOf(ex).map(boneOfField),
});

const boneOfPart = (p) => ({
  id: p.id,
  number: p.number,
  label: p.label,
  title: p.title,
  ...(p.optional ? { optional: true } : {}),
  time: p.time,
  ...(p.video ? { video: p.video } : {}),
  finish: p.finish,
  ...(p.setup ? { setup: { fields: (p.setup.fields ?? []).map(boneOfField) } } : {}),
  exercises: p.exercises.map((e) => boneOfExercise(e)),
  ...(p.summary ? { summary: boneOfExercise(p.summary, "summary") } : {}),
});

const spineOf = (content) => ({
  note: "The shape of this step, for the browser. The words live on the server; see lib/content-server.",
  step: {
    id: content.step.id,
    number: content.step.number,
    title: content.step.title,
    question: content.step.question,
  },
  parts: content.parts.map(boneOfPart),
});

mkdirSync(`${dir}/web/src/content/spine`, { recursive: true });

for (const n of [1, 2, 3]) {
  const source = `${dir}/step${n}-content.json`;
  let content;
  try {
    content = JSON.parse(readFileSync(source, "utf8"));
  } catch {
    continue;
  }
  const spine = spineOf(content);
  const out = `${dir}/web/src/content/spine/step${n}.json`;
  writeFileSync(out, JSON.stringify(spine, null, 2) + "\n", "utf8");
  const pages = spine.parts.reduce((t, p) => t + p.exercises.length + (p.summary ? 1 : 0), 0);
  const size = Math.round(JSON.stringify(spine).length / 1024);
  const full = Math.round(JSON.stringify(content).length / 1024);
  console.log(`step ${n}: ${spine.parts.length} parts, ${pages} pages — ${size} KB of shape, ${full} KB left behind`);
}
