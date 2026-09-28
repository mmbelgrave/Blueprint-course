// Builds step1-content.json (v19) out of the pieces in this folder.
//   node content-build/assemble-step1.mjs
import { readFileSync, writeFileSync } from "node:fs";

const here = new URL(".", import.meta.url);
const read = (name) => JSON.parse(readFileSync(new URL(name, here), "utf8"));

const head = read("s1-step.json");
const parts = [...read("s1-p0-p1.json"), ...read("s1-p2.json"), ...read("s1-p3.json"), ...read("s1-p4-p5.json")];

const content = {
  version: head.version,
  source: head.source,
  source_note: head.source_note,
  schema_notes: {
    ids: "Part, exercise, summary and field IDs are stable keys for saved answers. Do not rename them when only the wording changes.",
    text: "'intro' and 'prompt' may be a string or a list of paragraphs. 'intro_title' is the heading above a part's explanation. An exercise 'promise' is the one line under its title. 'bullets' is a bullet list shown after the prompt. A field 'hint' is a short text shown above that field; 'heading' starts a new block inside the exercise. A field 'marker' (A, B, C…) is shown as a large letter before its label.",
    optional: "'optional': true marks a part or exercise the person may skip.",
    summary: "Each part (except Part 5) ends with a 'summary' block ('What does this tell me?'). The person fills it in; the AI partner may offer a draft from their own answers. 'result' is the one-line result of the part.",
    unknown_numbers: "Number and money cells accept 'unknown' or '?'. A total with an unknown number is shown as not complete yet — an unknown never counts as zero.",
    story_status: "'draft' = Mwata still checks the wording and facts. 'ready' = checked.",
    boxes: "'tips' = a 'Good to know' box. 'watch_out' = a 'Watch out' box. 'challenge' = 'A friendly challenge'. 'story' = 'My story — Mwata' (a 'go_deeper' block may hold its own story). 'talk' (on a part) = 'Talk about it'. 'result_guide' = 'What your result means'. 'example_page' = a fully filled-in example, shown as rows.",
    tables: "'tables' on an exercise are fixed content tables (not filled in): 'place' ('before' or 'after' the answer fields), 'lead' above it, optional 'header' row, and 'after' below it.",
  },
  field_types: {
    long_text: "Free text area. 'lines' is a hint for the height; 'placeholder' is grey ghost text that is never saved.",
    short_text: "One line of text.",
    list: "A fixed number of short text items ('count').",
    table:
      "Rows x columns. 'row_labels' are fixed labels in the first column ('row_header' is its title; 'row_labels_editable' says which of them the person may rewrite); if 'rows' is given without labels, rows are empty. 'rows_from' fills the rows from another answer. 'columns' lists the columns the user fills in; column 'kind' is text, long_text, number, money or choice (with 'options'). 'column_names_from' renames the columns after another answer. 'totals': true shows totals for money columns ('totals_label'); 'total_filter' counts only rows whose column value is in the list; 'extra_totals' adds further total rows with their own filter.",
    checkbox_pick: "Pick from 'options'. 'pick' = how many to choose (no 'pick' = any number). 'allow_custom' = user may add own words.",
    yes_no: "One answer per item in 'questions'. 'options' lists the answers (default: Yes, No).",
    single_choice: "Choose one of 'options'.",
    number: "A number, with optional 'unit'.",
    calculation:
      "A worked calculation with an 'Example' column (fixed text) and a 'Me' column. Each row is an input, comes 'from' a table total in another exercise, or is a 'formula' of earlier row IDs in the same exercise. 'condition' shows a row only when it is true. 'format' (money by default): 'left_or_short' or 'months'.",
    image_board:
      "Pictures the person adds (a vision board), up to 'max'. Each picture has a one-line caption ('caption_label'). The pictures stay in the person's own account; the AI partner reads only the captions.",
  },
  step: head.step,
  parts,
  closing: head.closing,
  sources: head.sources,
};

// The route table on the step overview is built from the parts themselves.
content.step.route.rows = parts.map((p) => [
  p.id === "p0" ? "Start (optional)" : p.label,
  p.route_title ?? p.title,
  p.time ?? "",
  p.finish?.title ?? "",
]);

const out = new URL("../step1-content.json", here);
writeFileSync(out, JSON.stringify(content, null, 2) + "\n", "utf8");

const exercises = parts.flatMap((p) => p.exercises);
console.log(`step1-content.json written: version ${content.version}`);
console.log(`parts: ${parts.length} · exercises: ${exercises.length} · summaries: ${parts.filter((p) => p.summary).length}`);
console.log(`pages: ${exercises.map((e) => e.id).join(", ")}`);
