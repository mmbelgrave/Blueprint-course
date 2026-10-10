/**
 * What goes on each page of a result document (spec §6.5).
 *
 * The pages in app/step/[step]/print and app/phase/[phase]/print are the
 * paper; this is everything that gets printed on it. It is kept apart from
 * them, and free of React, so the awkward part — which answer becomes which
 * number, and what to do when somebody left it empty — can be read and tested
 * on its own.
 *
 * Three rules run through all of it:
 *
 *   1. Every word and every number is the person's own. Nothing here writes a
 *      sentence on their behalf; the only text this file produces is a label.
 *   2. A missing answer is missing, never zero. The documents go to partners,
 *      parents and advisers, and a confident figure resting on a blank is the
 *      one mistake that could cost somebody real money.
 *   3. Money follows the workbook's own rules: "unknown" makes a total
 *      incomplete, and only confirmed and agreed income counts (see
 *      blueprint.ts, which this file leans on for the money thread).
 *
 * Row keys: every table in the content is stored as r0, r1, r2 … in the order
 * the workbook prints its rows. The constants below name those positions, and
 * tests/report.test.ts checks each one against the content file, so a row
 * moving in the workbook fails a test rather than quietly mislabelling a
 * chart.
 */
import { moneyThread, type Answers, type MoneyThread } from "./blueprint.ts";
import { parseAmount, tableTotal } from "./money.ts";

export type { Answers };

/* ────────────────────────────── reading ───────────────────────────────── */

const text = (a: Answers, page: string, field: string): string => {
  const v = a[page]?.[field];
  return typeof v === "string" ? v.trim() : "";
};

type Rows = Record<string, Record<string, string> | undefined>;
const rowsOf = (a: Answers, page: string, field: string): Rows => (a[page]?.[field] as Rows | undefined) ?? {};

const listOf = (a: Answers, page: string, field: string): string[] => {
  const v = a[page]?.[field];
  return Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter(Boolean) : [];
};

const cell = (rows: Rows, row: number, col: string): string => (rows[`r${row}`]?.[col] ?? "").trim();

const num = (raw: unknown): number | null => {
  const a = parseAmount(raw);
  return a.kind === "number" ? a.value : null;
};

/** Every filled row of a table, in the workbook's own order. */
function filledRows(rows: Rows, keep: (r: Record<string, string>) => boolean = () => true) {
  return Object.keys(rows)
    .sort((x, y) => Number(x.slice(1)) - Number(y.slice(1)))
    .map((k) => ({ key: k, index: Number(k.slice(1)), row: rows[k] ?? {} }))
    .filter((r) => Object.values(r.row).some((v) => String(v ?? "").trim()) && keep(r.row));
}

/**
 * Free text broken into the lines a person actually typed — or, when they
 * typed one paragraph, into its sentences. People answer "what is still
 * unknown" as a list on one page and as a paragraph on the next, and a list
 * with one long line in it is not a list.
 */
export function lines(value: string): string[] {
  const typed = value
    .split(/\r?\n+/)
    .map((l) => l.replace(/^[-•·*]\s*/, "").trim())
    .filter(Boolean);
  if (typed.length !== 1) return typed;
  const sentences = typed[0]
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((x) => x.trim())
    .filter(Boolean);
  return sentences.length > 1 ? sentences : typed;
}

/**
 * The opening of a document: their own first sentence, broken over two lines
 * the way the cover sets it, and the rest kept as the quote underneath.
 *
 * Never a sentence of ours. A blueprint that opens with words the person did
 * not write is not theirs, however well it reads.
 */
export function coverWords(sentence: string): { headline: string; tail?: string; quote?: string } {
  const clean = sentence.replace(/\s+/g, " ").trim();
  if (!clean) return { headline: "" };
  const end = clean.search(/[.!?](\s|$)/);
  const first = end === -1 ? clean : clean.slice(0, end + 1);
  const rest = end === -1 ? "" : clean.slice(end + 1).trim();

  // Two lines read better than one long one; break at the last comma in the
  // first half, which is where the sentence takes its own breath.
  const half = Math.floor(first.length / 2);
  const comma = first.lastIndexOf(", ", Math.max(half, 24));
  if (first.length > 52 && comma > 12) {
    return { headline: first.slice(0, comma + 1), tail: first.slice(comma + 2), quote: rest || undefined };
  }
  return { headline: first, quote: rest || undefined };
}

/** A sentence with any full stop taken off the end, so two can be joined. */
export const noStop = (value: string) => value.trim().replace(/[.;,]+$/, "");

/** The first clause of a sentence: up to the first comma, dash or semicolon. */
export function firstClause(value: string, most = 70): string {
  const clean = noStop(value.replace(/\s+/g, " "));
  const cut = clean.search(/[,;—–]/);
  const first = cut > 12 ? clean.slice(0, cut) : clean;
  return first.length > most ? `${first.slice(0, most - 1).trim()}…` : first;
}

/**
 * A length of time named in a sentence — "a trial year", "twelve months" —
 * for the figure on the Blueprint cover. Nothing invented: if they did not
 * say how long, the document does not say either.
 */
export function durationIn(value: string): string | null {
  const words: Record<string, number> = { one: 1, two: 2, three: 3, six: 6, nine: 9, twelve: 12, eighteen: 18 };
  const months = /\b(\d{1,2}|one|two|three|six|nine|twelve|eighteen)[\s-]months?\b/i.exec(value);
  if (months) {
    const n = Number(months[1]) || words[months[1].toLowerCase()];
    if (n) return n === 12 ? "1 year" : `${n} months`;
  }
  const years = /\b(a|one|two|three|\d{1,2})[\s-](?:trial[\s-])?years?\b/i.exec(value);
  if (years) {
    const n = years[1].toLowerCase() === "a" ? 1 : Number(years[1]) || words[years[1].toLowerCase()];
    if (n) return n === 1 ? "1 year" : `${n} years`;
  }
  return null;
}

/* ─────────────────────────── where the rows are ───────────────────────── */

/** 2.1 "Your life today, and in one year" — the eight areas, in workbook order. */
export const WHEEL_AREAS = [
  "Health and energy",
  "Money",
  "Work",
  "Love and relationship",
  "Family and friends",
  "Fun and free time",
  "Personal growth",
  "Home and surroundings",
];

/** 2.1 "Who decides my week" — the third row is the one that matters. */
export const DECIDES_ROWS = ["Fixed by others", "Must-dos", "My choice"];
const MY_CHOICE_ROW = 2;
/** The workbook's own figure: 16 waking hours a day, seven days. */
export const WAKING_HOURS = 112;

/** s3-1.1 check one — savings, and everything taken out of them. */
export const CHECK_ONE_ROWS = [
  "Savings I can use within a month",
  "Minus: the cost of deciding",
  "Minus: the one-time cost of the move",
  "Minus: deposits, money I pay now and may only get back much later",
  "Minus: my reserve",
  "Minus: my return fund (from Plan B, kept apart)",
  "Savings left to live on",
];

/** s3-1.1 check two — the month, and how long the savings last. */
export const CHECK_TWO_ROWS = [
  "My confirmed income per month in the new place",
  "Agreed income, and the month it starts (not counted yet)",
  "My costs per month in the new place (known / estimate / unknown)",
  "Left over or short each month",
  "If short: how many months my savings left to live on can cover (my runway)",
  "The runway I want, in months (my choice)",
  "If everything costs 30% more: what changes?",
];

/** The five lights, in the order the workbook asks for them. */
export const LIGHT_NAMES = ["Money", "Papers", "People", "Place", "Plan B"];

/** s2-3.3 "the daily life check" — long questions, short names for a chart. */
export const DAILY_ROWS: { label: string; short: string }[] = [
  { label: "Distance and time to a hospital", short: "Hospital" },
  { label: "Family doctor: is there one taking new patients?", short: "Family doctor" },
  { label: "How healthcare works for someone like me", short: "Healthcare" },
  { label: "Schools, and the language they teach in", short: "School" },
  { label: "Internet speed at a real address there", short: "Internet" },
  { label: "Work or clients for me", short: "Work" },
  { label: "Shops and daily needs", short: "Shops" },
  { label: "Nearest airport and travel time home", short: "Airport" },
];

/* ───────────────────────────── small pieces ───────────────────────────── */

export type Light = { name: string; colour: "green" | "amber" | "red" | "unknown"; note?: string; when?: string };

/** The five lights as the summary page recorded them. */
export function lightsOf(a: Answers): Light[] {
  const rows = rowsOf(a, "green_lights", "lights");
  return LIGHT_NAMES.map((name, i) => {
    const raw = cell(rows, i, "colour").toLowerCase();
    const colour = raw.startsWith("green") ? "green" : raw.startsWith("amber") ? "amber" : raw.startsWith("red") ? "red" : "unknown";
    return { name, colour, note: cell(rows, i, "turns_green") || undefined, when: cell(rows, i, "by_when") || undefined };
  });
}

/** Only the lights that are not green yet: the conditions still in the way. */
export const openLights = (l: Light[]) => l.filter((x) => x.colour === "amber" || x.colour === "red");

/**
 * The savings cascade of s3-1.1, as a waterfall.
 *
 * The closing figure is the person's own "savings left to live on" where they
 * wrote one, not our subtraction of their rows: if the two disagree, the
 * document shows what they decided.
 */
export type Cascade = { steps: { label: string; amount: number; kind: "start" | "take" | "keep" | "end" }[]; left: number | null };

export function savingsCascade(a: Answers): Cascade | null {
  const rows = rowsOf(a, "s3-1.1", "check_one");
  const at = (i: number) => num(cell(rows, i, "amount"));
  const start = at(0);
  if (start === null) return null;

  const taken = (
    [
      { label: "Deciding costs", amount: at(1) ?? 0, kind: "take" },
      { label: "Moving costs", amount: at(2) ?? 0, kind: "take" },
      { label: "Tied-up deposits", amount: at(3) ?? 0, kind: "take" },
      { label: "Emergency reserve", amount: at(4) ?? 0, kind: "keep" },
      { label: "Return fund", amount: at(5) ?? 0, kind: "keep" },
    ] as Cascade["steps"]
  ).filter((s) => s.amount > 0);

  const left = at(6) ?? start - taken.reduce((t, s) => t + s.amount, 0);
  return {
    steps: [
      { label: "Savings available", amount: start, kind: "start" },
      ...taken,
      { label: "For monthly shortfalls", amount: Math.max(0, left), kind: "end" },
    ],
    left,
  };
}

/** The three figures under the cascade: runway, runway under stress, runway wanted. */
export function runway(a: Answers): { months: number | null; stress: string; wanted: string } {
  const rows = rowsOf(a, "s3-1.1", "check_two");
  const cascade = savingsCascade(a);
  const short = num(cell(rows, 3, "answer"));
  const left = cascade?.left ?? null;
  const months = left !== null && short !== null && short < 0 ? Math.floor(left / -short) : num(cell(rows, 4, "answer"));
  return { months, stress: cell(rows, 6, "answer"), wanted: cell(rows, 5, "answer") };
}

/** The share of the waking week this person decides about, now and wanted. */
export function myTime(a: Answers): { now: number | null; want: number | null; nowHours: number | null; wantHours: number | null } {
  const rows = rowsOf(a, "2.1", "decides");
  const h = (col: string) => num(cell(rows, MY_CHOICE_ROW, col));
  const nowHours = h("now");
  const wantHours = h("want");
  const pc = (x: number | null) => (x === null ? null : Math.round((x / WAKING_HOURS) * 100));
  return { now: pc(nowHours), want: pc(wantHours), nowHours, wantHours };
}

/** Today against a year from now, biggest gaps first — only areas they scored. */
export function wheel(a: Answers, most = 6) {
  const rows = rowsOf(a, "2.1", "wheel");
  return WHEEL_AREAS.map((label, i) => ({
    label,
    from: num(cell(rows, i, "today")),
    to: num(cell(rows, i, "year")),
  }))
    .filter((r) => r.from !== null || r.to !== null)
    .sort((x, y) => gap(y) - gap(x))
    .slice(0, most);
}

const gap = (r: { from: number | null; to: number | null }) =>
  r.from === null || r.to === null ? -1 : r.to - r.from;

/** Totals of a money table, counted the way the app's own screens count them. */
function totalOf(a: Answers, page: string, field: string, column: string, filter?: { column: string; values: string[] }) {
  const t = tableTotal(a[page]?.[field], column, { certaintyColumn: "certainty", filter });
  return t.filled > 0 ? { value: t.value, complete: t.complete } : { value: null, complete: true };
}

/* ───────────────────────────── the documents ──────────────────────────── */

export type Option = { letter: string; what: string; doubt?: string; test?: string };

/** Step 1's options, as the person listed them in 4.1. */
export function options(a: Answers, most = 2): Option[] {
  return filledRows(rowsOf(a, "4.1", "options"))
    .filter((r) => r.row.option?.trim())
    .slice(0, most)
    .map((r) => ({
      letter: "ABCD"[r.index] ?? String(r.index + 1),
      what: r.row.option.trim(),
      doubt: r.row.not_sure?.trim() || undefined,
      test: r.row.test?.trim() || undefined,
    }));
}

export type Step1 = ReturnType<typeof step1Report>;

export function step1Report(a: Answers) {
  const costs = totalOf(a, "3.2", "costs", "new_life");
  const income = totalOf(a, "3.4", "income", "new_life", { column: "certainty", values: ["Confirmed", "Agreed"] });
  const oneTime = totalOf(a, "3.3", "one_time", "amount");
  const balance = costs.value !== null && income.value !== null ? income.value - costs.value : null;

  const savings = num(a["3.5"]?.["savings"] && (a["3.5"]["savings"] as Record<string, unknown>)["savings"]);
  const deposits = num(a["3.5"]?.["savings"] && (a["3.5"]["savings"] as Record<string, unknown>)["deposits"]);
  const reserve = num(a["3.5"]?.["savings"] && (a["3.5"]["savings"] as Record<string, unknown>)["reserve"]);
  const available =
    savings === null ? null : savings - (oneTime.value ?? 0) - (deposits ?? 0) - (reserve ?? 0);

  return {
    cover: coverWords(text(a, "5.1", "life_picture")),
    when: text(a, "5.1", "date"),
    choice: text(a, "5.1", "choice"),
    directions: text(a, "5.1", "directions"),
    options: options(a),
    protect: text(a, "1.4", "keep") || text(a, "life_picture", "keep"),
    values: listOf(a, "1.4", "values"),
    // Part 2
    today: text(a, "starting_point", "today"),
    wheel: wheel(a),
    time: myTime(a),
    takeBack: text(a, "2.1", "take_back"),
    strengths: text(a, "starting_point", "strengths"),
    // Part 3
    costs,
    income,
    oneTime,
    balance,
    savings,
    reserve,
    available,
    mustHaves: filledRows(rowsOf(a, "1.4", "must_haves"))
      .map((r) => ({ what: r.row.must_have?.trim() ?? "", how: r.row.importance?.trim() ?? "" }))
      .filter((m) => m.what),
    dealbreakers: text(a, "1.4", "dealbreakers"),
    nextStep: text(a, "5.1", "next_step"),
    assumptions: text(a, "5.1", "assumptions"),
    reviewWhen: text(a, "5.1", "review_when"),
    continueOrStop: text(a, "5.1", "continue_or_stop"),
    letGo: text(a, "options", "let_go"),
  };
}

export type Step2 = ReturnType<typeof step2Report>;

export function step2Report(a: Answers) {
  // Countries, then regions: whichever list the person actually scored.
  const scored = (page: string, field: string, namesField: string, cols: string[]) => {
    const names = listOf(a, page, namesField);
    const rows = rowsOf(a, page, field);
    return cols
      .map((col, i) => {
        let score = 0;
        let filled = 0;
        for (const key of Object.keys(rows)) {
          const v = num(rows[key]?.[col]);
          if (v !== null) {
            score += v;
            filled++;
          }
        }
        return { label: names[i] || "", score, filled };
      })
      .filter((c) => c.label && c.filled > 0);
  };

  const countries = scored("s2-1.2", "scores", "countries", ["c1", "c2", "c3", "c4"]);
  const regions = scored("s2-2.3", "scores", "regions", ["r1", "r2", "r3", "r4"]);
  /* The one they chose, which is not always the highest total — and saying so
     is half the point of showing the scores at all. */
  const chose = text(a, "region_shortlist", "shortlist") || text(a, "country_choice", "country");

  const daily = rowsOf(a, "s2-3.3", "daily");
  const spokes = DAILY_ROWS.map((r, i) => {
    const answer = cell(daily, i, "p1") || cell(daily, i, "p2");
    const time = /(\d+)\s*(min|minute|hour|hr|h\b|km)/i.exec(answer);
    return {
      label: r.short,
      value: time ? `${time[1]}${/h/i.test(time[2]) ? " h" : /km/i.test(time[2]) ? " km" : " min"}` : "",
      sure: /known/i.test(cell(daily, i, "certainty")),
      answer,
    };
  }).filter((s) => s.value);

  const guess = totalOf(a, "3.2", "costs", "new_life");
  const found = totalOf(a, "s2-3.1", "costs", "found");
  const income = totalOf(a, "3.4", "income", "new_life", { column: "certainty", values: ["Confirmed"] });

  return {
    cover: coverWords(text(a, "s2-5.1", "place")),
    where: text(a, "s2-5.1", "where"),
    when: text(a, "s2-5.1", "date"),
    choice: text(a, "s2-5.1", "choice"),
    spokes,
    countries,
    regions,
    chose,
    reasons: text(a, "s2-5.1", "reasons"),
    notGive: text(a, "s2-5.1", "not_give"),
    voices: [
      { who: "An ordinary week", words: text(a, "s2-4.3", "ordinary_week") },
      { who: "What I would rather not have seen", words: text(a, "s2-4.3", "rather_overlooked") },
      { who: "A good surprise", words: text(a, "s2-4.3", "good_surprise") },
    ].filter((v) => v.words),
    changed: text(a, "test_visit", "changed"),
    confirmed: text(a, "test_visit", "confirmed"),
    guess,
    found,
    income,
    monthlyCost: text(a, "s2-5.1", "monthly_cost"),
    incomeThere: text(a, "s2-5.1", "income"),
    legal: text(a, "s2-5.1", "legal"),
    unknowns: lines(text(a, "s2-5.1", "unknowns")),
    nextStep: text(a, "s2-5.1", "next_step"),
    reviewWhen: text(a, "s2-5.1", "review_when"),
  };
}

export type Step3 = ReturnType<typeof step3Report>;

export function step3Report(a: Answers) {
  const risks = filledRows(rowsOf(a, "s3-2.2", "risks"))
    .filter((r) => r.row.fear?.trim())
    .slice(0, 3)
    .map((r) => ({
      title: r.row.fear.trim(),
      sign: r.row.sign?.trim() || undefined,
      answer: r.row.do?.trim() || undefined,
      likely: r.row.likely?.trim() || undefined,
    }));

  const steps = filledRows(rowsOf(a, "s3-3.1", "steps"))
    .filter((r) => r.row.step?.trim())
    .slice(0, 5)
    .map((r) => ({ when: r.row.when?.trim() || undefined, what: r.row.step.trim(), note: r.row.first?.trim() || undefined }));

  return {
    decision: text(a, "s3-4.2", "decision"),
    question: text(a, "s3-4.2", "question") || text(a, "s3-0.1", "the_option"),
    what: text(a, "s3-0.1", "what_go_means"),
    conditions: text(a, "s3-4.2", "conditions"),
    when: text(a, "s3-4.2", "first_step_date") || text(a, "s3-0.1", "decide_by"),
    lights: lightsOf(a),
    money: moneyThread(a),
    cascade: savingsCascade(a),
    runway: runway(a),
    risks,
    steps,
    returnFund: text(a, "s3-1.5", "return_fund"),
    keepForPlanB: text(a, "s3-1.5", "keep"),
    warningSign: text(a, "s3-1.5", "warning_sign"),
    alternative: text(a, "s3-2.1", "o2_good") || text(a, "s3-4.3", "meanwhile"),
    rentOrBuy: text(a, "s3-1.4", "rent_or_buy"),
    firstStep: text(a, "s3-4.2", "first_step"),
    firstStepDate: text(a, "s3-4.2", "first_step_date"),
    reviewWhen: text(a, "s3-4.2", "review_when"),
    wouldChange: text(a, "s3-4.2", "would_change"),
    reasons: text(a, "s3-4.2", "reasons"),
    whoDecided: text(a, "s3-4.2", "who_decided"),
  };
}

export type Blueprint = ReturnType<typeof blueprintReport>;

export function blueprintReport(a: Answers) {
  const needs = filledRows(rowsOf(a, "s3-4.1", "check"))
    .filter((r) => r.row.item?.trim())
    .slice(0, 5)
    .map((r) => ({
      need: r.row.item.trim(),
      found: r.row.meets?.trim() ?? "",
      state: r.row.certainty?.trim() || "—",
      sure: /known/i.test(r.row.certainty ?? ""),
    }));

  const three = step3Report(a);
  return {
    ...three,
    cover: coverWords(text(a, "5.1", "life_picture") || text(a, "s3-0.1", "life_picture")),
    dates: {
      one: text(a, "5.1", "date"),
      two: text(a, "s2-5.1", "date"),
      three: text(a, "s3-4.2", "first_step_date") || text(a, "s3-0.1", "decide_by"),
    },
    place: text(a, "s2-5.1", "place") || text(a, "s3-1.4", "place"),
    where: text(a, "s2-5.1", "where"),
    values: listOf(a, "1.4", "values"),
    time: myTime(a),
    needs,
    protect: text(a, "1.4", "keep") || text(a, "life_picture", "keep"),
    accept: text(a, "1.4", "let_go"),
    twoYears: text(a, "5.1", "two_years"),
    dealbreakers: text(a, "1.4", "dealbreakers"),
  };
}

export type { MoneyThread };
