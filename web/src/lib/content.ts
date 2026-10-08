// Typed access to the workbook content: Step 1 (Picture, workbook v19) and
// Step 2 (Explore, workbook v8). The JSON files are copied from the project
// folder by scripts/sync-content.mjs — never edit the copies.
import step1Raw from "@/content/step1-content.json";
import step2Raw from "@/content/step2-content.json";
import journeyRaw from "@/content/journey.json";
import appGuideRaw from "@/content/app-guide.json";

/** Product naming (decision of 20 Sep 2026, see PROJECT.md). */
export const PRODUCT = {
  brand: "The Life You Choose",
  name: "The Made Real Blueprint",
  edition: "Portugal Edition",
  /** Shown at the foot of every printed result. */
  copyright_holder: "The Life You Choose",
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
  /** A column total of a table, or one row of it when 'row' names a row label. */
  from?: { exercise: string; field: string; column: string; row?: string };
  formula?: string;
  condition?: string;
  format?: "money" | "left_or_short" | "months" | "percent";
  /** Feeds the formulas without being shown (2.1: the hours behind the share). */
  hidden?: boolean;
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
    | "calculation"
    | "image_board";
  marker?: string;
  label?: string;
  hint?: string;
  /** Starts a new named block inside an exercise ("Then look at your time"). */
  heading?: string;
  /** image_board: how many pictures the person may add, and the caption's label. */
  max?: number;
  caption_label?: string;
  placeholder?: string;
  lines?: number;
  count?: number;
  item_label?: string;
  row_header?: string;
  row_labels?: string[];
  /** Which fixed row labels the person may rewrite (4.1: A, B and C, not D). */
  row_labels_editable?: boolean[];
  rows?: number | CalcRow[];
  rows_from?: { exercise: string; field: string; column: string };
  column_names_from?: { field: string };
  columns?: TableColumn[];
  totals?: boolean;
  totals_label?: string;
  total_filter?: { column: string; values: string[] };
  /** Further total rows with their own filter (3.4: confirmed/agreed, then hoped). */
  extra_totals?: { label: string; filter: { column: string; values: string[] } }[];
  prefill?: Record<string, string>;
  copy_from?: { step?: number; exercise: string; field: string };
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
  /** A named block ("Connect the dots") and its own story, in "Go deeper". */
  title?: string;
  prompt?: Text;
  bullets?: string[];
  fields: Field[];
  /** A sentence after the fields ("No one to ask? …"). */
  closing?: string;
  story?: { status: string; text: string };
  auto_hint?: string;
  app_note?: string;
};

export type Example = { who: string; text: string };
export type Story = { status: string; text: string };

/** One or many, always read as a list. */
export const asList = <T,>(v: T | T[] | undefined): T[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

/** A fixed content table (not filled in by the person). */
export type InfoTable = {
  place: "before" | "after";
  lead?: string;
  /** A header row, when the table has column titles. */
  header?: string[];
  columns?: string[];
  rows: string[][];
  /** A sentence under the table. */
  after?: string;
};

/** An exercise, or a part summary shown as its own page ("kind": "summary"). */
export type Exercise = {
  id: string;
  kind?: "exercise" | "summary";
  /** The number people see (Step 2 IDs carry an "s2-" prefix; summaries get the next number). */
  number?: string;
  title: string;
  /** A word before the title ("Warm-up"). */
  kicker?: string;
  /** The one line under the title. */
  promise?: string;
  optional?: boolean;
  intro?: Text;
  intro_bullets?: string[];
  tables?: InfoTable[];
  /** Missing on a page that is only there to be read (Step 2 1.1, 2.1, 2.2). */
  start_here?: Block;
  go_deeper?: Block;
  example?: Example | Example[];
  /** A fully filled-in example page (5.1: Rosa). */
  example_page?: { title: string; intro?: string; rows: string[][] };
  /** "What your result means" (3.5). */
  result_guide?: { title: string; intro?: Text; bullets?: string[]; closing?: string };
  tips?: string[];
  watch_out?: string[];
  story?: Story | Story[];
  challenge?: string;
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
  /** A sentence after the boxes, and the one-line result of the part. */
  closing?: string;
  result?: string;
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
  /** "Thinking of staying?" — the same part, read by someone who may not move. */
  staying?: string;
  /** The heading above the part's explanation ("Why we start with a picture"). */
  intro_title?: string;
  intro: Text;
  intro_bullets?: string[];
  intro_after?: string;
  tips?: string[];
  setup?: { intro?: string; fields: Field[] };
  time: string;
  exercises: Exercise[];
  talk?: string;
  /**
   * One video per part; the address follows when Mwata has recorded it.
   * 'audio_url' is the same lesson as sound only, for listening on the go.
   */
  video?: { title: string; length: string | null; url: string | null; audio_url?: string | null };
  summary?: Summary;
  go_further?: string;
  /** Part 5 has no summary page; it states its result directly. */
  result?: string;
  finish: { id: string; title: string; description?: string };
};

/** A titled block of bullet points (how this step works, what you need). */
export type BulletBlock = { title: string; bullets: string[]; after?: string };

/** A titled block of rows (three ways to use this step, the route, the sources). */
export type RowBlock = {
  title: string;
  intro?: string;
  header?: string[];
  rows: string[][];
  challenge?: string;
  closing?: string;
  expert_work?: string;
};

export type StepContent = {
  version: number;
  source?: string;
  source_note?: string;
  step: {
    id: string;
    number: number;
    title: string;
    question: string;
    tagline: string[];
    intro: string[];
    ways_to_use?: RowBlock;
    what_you_need?: BulletBlock;
    where_to_start?: RowBlock;
    how_it_works: BulletBlock;
    word_help: { title: string; items: string[][] };
    tips?: string[];
    route: RowBlock;
  };
  parts: Part[];
  closing: { title: string; intro: string; bullets: string[]; tips?: string[]; final: string[] };
  sources?: RowBlock;
};

/** The whole road (Introduction v5): three phases, eight steps. */
export type Journey = {
  title: string;
  intro: string;
  phases: { id: string; name: string; steps: number[]; says: string }[];
  two_outcomes: string;
  steps: {
    number: number;
    title: string;
    question: string;
    result: string;
    in_app: boolean;
    /** What the overview says about a step that is not open ("coming soon"). */
    note?: string;
  }[];
};

/** "Read this first": what is the same in every step, so no step repeats it. */
export type AppGuide = {
  title: string;
  intro: string;
  sections: { id: string; title: string; shared_bullets?: boolean; bullets?: string[]; rows?: string[][] }[];
  closing: string;
};

export const journey = journeyRaw as Journey;
export const appGuide = appGuideRaw as AppGuide;

/** The bullets the guide already carries; a step overview leaves those out. */
const SHARED_BULLETS = new Set(
  appGuide.sections.filter((s) => s.shared_bullets).flatMap((s) => s.bullets ?? []),
);
export const stepOnlyBullets = (bullets: string[]) => bullets.filter((b) => !SHARED_BULLETS.has(b));

/**
 * Is this step open to people? A step can be written and still be closed: Step 2
 * waits for its final workbook. Its content and everyone's answers stay where
 * they are; only the door is shut (journey.json, in_app).
 */
export const stepIsOpen = (n: number) => journey.steps.some((s) => s.number === n && s.in_app);

/*
 * Only released steps are imported here, because whatever this file imports is
 * compiled into JavaScript that anyone can fetch without signing in — no
 * account, no cookie. Step 3 is written but not released, so it is not in this
 * list and its text is nowhere in the browser.
 *
 * To release a step: add its import above and its name here, and set in_app in
 * journey.json. Both, or it will not appear.
 *
 * This is a stopgap. The real fix is to stop sending the words to the browser
 * at all until the access layer says they may be sent — see lib/content-server.
 */
export const steps: StepContent[] = [step1Raw, step2Raw] as unknown as StepContent[];

export function getStep(number: number): StepContent | undefined {
  return steps.find((s) => s.step.number === number);
}

export const paragraphs = (t: Text | undefined): string[] =>
  t === undefined ? [] : Array.isArray(t) ? t : [t];

/**
 * The summary's number follows the last exercise of the part, not the number of
 * exercises: Part 1 starts at 1.0 (the warm-up), so its summary is 1.6, not 1.7.
 */
function summaryNumber(part: Part): string {
  const last = part.exercises.at(-1);
  const shown = last?.number ?? last?.id ?? `${part.number}.0`;
  const tail = Number(shown.split(".").at(-1));
  return Number.isFinite(tail) ? `${part.number}.${tail + 1}` : `${part.number}.${part.exercises.length + 1}`;
}

/** A part summary as a page, so it behaves like any other exercise. */
function summaryAsExercise(part: Part, s: Summary): Exercise {
  return {
    id: s.id,
    kind: "summary",
    number: summaryNumber(part),
    title: part.finish.title,
    intro: s.intro,
    intro_bullets: s.questions,
    start_here: { prompt: s.prompt, fields: s.fields, closing: s.closing },
    tips: s.tips,
    example: s.example,
    go_further: part.go_further,
  };
}

/** The one-line result of a part ("My Life Picture — …"), wherever it is stored. */
export const partResult = (part: Part) => part.summary?.result ?? part.result;

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
  return [...(ex.start_here?.fields ?? []), ...(ex.go_deeper?.fields ?? [])].filter((f) => f.type !== "heading");
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
