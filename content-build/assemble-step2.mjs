import { readFileSync, writeFileSync } from "node:fs";
const dir = process.argv[2];
const read = (n) => JSON.parse(readFileSync(`${dir}/content-build/${n}`, "utf8"));
const head = read("s2-step.json");
const parts = [...read("s2-p0-p2.json"), ...read("s2-p3-p5.json")];
const content = {
  version: head.version,
  source: head.source,
  schema_notes: {
    ids: "Part, exercise, summary and field IDs are stable keys for saved answers. Do not rename them when only the wording changes.",
    same_as_step1: "Field types, boxes, summaries, markers and unknown numbers work as in step1-content.json.",
    copy_from: "A field with 'copy_from' offers the person's answer from Step 1 to copy in. They decide.",
    column_names_from: "A table column label like 'Country 1:' is followed by the name the person wrote in the list field named here.",
    score: "A 'score' column is chosen from 2 / 1 / 0; the totals row adds them up.",
    heading: "A field of type 'heading' has no answer: it shows a marker and a title above the fields that follow.",
    boxes: "'where_to_check' = official places to look (with the date checked). 'expert_work' = a 'This is expert work' box. Part 'can_skip' = the 'Can you skip this part?' box.",
  },
  step: head.step,
  parts,
  closing: head.closing,
  sources: head.sources,
};
content.step.route.rows = parts.map((p) => [
  p.id === "s2-p0" ? "Start" : p.optional ? `${p.label} (optional)` : p.label,
  p.route_title ?? p.title,
  p.time ?? "",
  p.finish?.title ?? "",
]);
writeFileSync(`${dir}/step2-content.json`, JSON.stringify(content, null, 2) + "\n", "utf8");
const ex = parts.flatMap((p) => p.exercises);
console.log(`step2-content.json written: version ${content.version}`);
console.log(`parts: ${parts.length} · exercises: ${ex.length} · summaries: ${parts.filter((p) => p.summary).length}`);
console.log(`pages: ${ex.map((e) => e.number ?? e.id).join(", ")}`);
