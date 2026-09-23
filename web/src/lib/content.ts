// Typed access to the workbook content: Step 1 (Picture, workbook v9) and
// Step 2 (Explore, workbook v2). The JSON files are copied from the project
// folder by scripts/sync-content.mjs — never edit the copies.
import step1Raw from "@/content/step1-content.json";
import step2Raw from "@/content/step2-content.json";

/** Product naming (decision of 20 Sep 2026, see PROJECT.md). */
export const PRODUCT = {
  brand: "The Life You Choose",
  name: "The Made Real Blueprint",
  edition: "Portugal Edition",
};

export type ColumnKind = "text" | "long_text" | "number" | "money" | "choice" | "score";

export type TableColumn = {
  id: string;
  label: string;
  kind: ColumnKind;
  options?: string[];
  allow_na?: boolean;
};

export type CalcRow = {
  id: string;
  label: string;
  example: string;
  input?: "money";
  from?: { exercise: string; field: string; column: string };
  formula?: string;
  condition?: string;
  format?: "money" | "left_or_short" | "months";
};

export type Field = {
  id: string;
  type:
    | "heading"
    | "long_text"
    | "short_text"
    | "list"
    | "table"
    | "checkbox_pick"
    | "yes_no"
    | "single_choice"
    | "number"
    | "calculation";
  marker?: string;
  label?: string;
  hint?: string;
  placeholder?: string;
  lines?: number;
  count?: number;
  item_label?: string;
  row_header?: string;
  row_labels?: string[];
  rows?: number | CalcRow[];
  rows_from?: { exercise: string; field: string; column: string };
  column_names_from?: { field: string };
  columns?: TableColumn[];
  totals?: boolean;
  totals_label?: string;
  total_filter?: { column: string; values: string[] };
  prefill?: Record<string, string>;
  copy_from?: { exercise: string; field: string };
  pick?: number;
  allow_custom?: boolean;
  options?: string[];
  questions?: string[];
  unit?: string;
  show_if?: Record<string, string>;
  app_note?: string;
};

export type Text = string | string[];

export type Block = {
  prompt?: Text;
  bullets?: string[];
  fields: Field[];
  auto_hint?: string;
  app_note?: string;
};

export type Example = { who: string; text: string };

/** A fixed content table (not filled in by the person). */
export type InfoTable = { place: "before" | "after"; lead?: string; columns?: string[]; rows: string[][] };

/** An exercise, or a part summary shown as its own page ("kind": "summary"). */
export type Exercise = {
  id: string;
  kind?: "exercise" | "summary";
  /** The number people see (Step 2 IDs carry an "s2-" prefix; summaries get the next number). */
  number?: string;
  title: string;
  optional?: boolean;
  intro?: Text;
  intro_bullets?: string[];
  tables?: InfoTable[];
  start_here: Block;
  go_deeper?: Block;
  example?: Example;
  tips?: string[];
  story?: { status: string; text: string };
  challenge?: string;
  freedom_idea?: string;
  where_to_check?: string[];
  expert_work?: string;
  belief_examples?: { title: string; items: string[] }[];
  choice_explanations_intro?: string;
  choice_explanations?: string[];
  go_further?: string;
};

export type Summary = {
  id: string;
  title: string;
  intro?: string;
  questions?: string[];
  prompt?: string;
  fields: Field[];
  tips?: string[];
  example?: Example;
};

export type Part = {
  id: string;
  number: number;
  label: string;
  optional?: boolean;
  title: string;
  route_title?: string;
  promise: string;
  can_skip?: string;
  intro: Text;
  intro_bullets?: string[];
  intro_after?: string;
  tips?: string[];
  setup?: { fields: Field[] };
  time: string;
  exercises: Exercise[];
  talk?: string;
  summary?: Summary;
  go_further?: string;
  finish: { id: string; title: string; description?: string };
};

export type StepContent = {
  version: string;
  step: {
    id: string;
    number: number;
    title: string;
    question: string;
    tagline: string[];
    intro_title?: string;
    intro: string[];
    before_you_start?: { title: string; bullets: string[]; note?: string };
    where_to_start?: { title: string; intro: string; columns: string[]; rows: string[][]; challenge?: string };
    how_it_works: string[];
    word_help: { term: string; meaning: string }[];
    route_tip?: string;
    general_tip?: string;
  };
  parts: Part[];
  closing: { title: string; text: string; next: string[]; tip: string; last_lines: string[] };
  sources?: { title: string; intro: string; columns: string[]; rows: string[][]; expert_work?: string };
  freedom_appendix: {
    title: string;
    text: string;
    link: string | null;
    honest_note: string;
    risk_note: string;
  };
};

export const steps: StepContent[] = [step1Raw, step2Raw] as unknown as StepContent[];

export function getStep(number: number): StepContent | undefined {
  return steps.find((s) => s.step.number === number);
}

export const paragraphs = (t: Text | undefined): string[] =>
  t === undefined ? [] : Array.isArray(t) ? t : [t];

/** A part summary as a page, so it behaves like any other exercise. */
function summaryAsExercise(part: Part, s: Summary): Exercise {
  return {
    id: s.id,
    kind: "summary",
    number: `${part.number}.${part.exercises.length + 1}`,
    title: part.finish.title,
    intro: s.intro,
    intro_bullets: s.questions,
    start_here: { prompt: s.prompt, fields: s.fields },
    tips: s.tips,
    example: s.example,
    go_further: part.go_further,
  };
}

/** "1.4 What matters most", "1.6 My Life Picture". */
export const displayNumber = (e: Exercise) => e.number ?? e.id;
export const displayTitle = (e: Exercise) => `${displayNumber(e)} ${e.title}`;

/** Everything a person works through in a part, in order. */
export function partItems(part: Part): Exercise[] {
  return part.summary ? [...part.exercises, summaryAsExercise(part, part.summary)] : part.exercises;
}

export type Located = { step: StepContent; part: Part; exercise: Exercise };

/** Every page of every step, in order. */
export const allExercises: Located[] = steps.flatMap((step) =>
  step.parts.flatMap((part) => partItems(part).map((exercise) => ({ step, part, exercise }))),
);

/** The pages of one step, in order (for next / previous). */
export const stepExercises = (stepNumber: number) =>
  allExercises.filter((e) => e.step.step.number === stepNumber);

export function findExercise(exerciseId: string): Located | undefined {
  return allExercises.find((e) => e.exercise.id === exerciseId);
}

/** All fields of an exercise (start here + go deeper). Headings are not answers. */
export function exerciseFields(ex: Exercise): Field[] {
  return [...ex.start_here.fields, ...(ex.go_deeper?.fields ?? [])].filter((f) => f.type !== "heading");
}

/** Where a part's setup answers (for example household size) are stored. */
export const setupKey = (part: Part) => `${part.id}-setup`;

/** The row keys a table field uses to store its values. */
export function tableRows(field: Field): { key: string; label?: string }[] {
  if (field.row_labels) {
    return field.row_labels.map((label, i) => ({ key: `r${i}`, label }));
  }
  const count = typeof field.rows === "number" ? field.rows : 1;
  return Array.from({ length: count }, (_, i) => ({ key: `r${i}` }));
}
