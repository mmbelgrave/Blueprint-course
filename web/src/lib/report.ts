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

/* A relative path on purpose: this file is read straight by the tests, which
   do not know the @ alias, and it has always stood on its own. */
import { overlap } from "./compare.ts";

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
  "My costs per month in the new place (known / estimate/unknown)",
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
/*
 * Each light is decided on its own page before it is carried into the summary
 * table, and plenty of people stop after the page (review round 4, R4-9).
 * These are the pages, in the order of LIGHT_NAMES.
 */
const LIGHT_PAGES = [
  { page: "s3-1.1", colour: "money_light", when: "money_green_by", note: "" },
  { page: "s3-1.2", colour: "papers_light", when: "papers_green_by", note: "papers" },
  { page: "s3-1.3", colour: "people_light", when: "people_green_by", note: "people" },
  { page: "s3-1.4", colour: "place_light", when: "place_green_by", note: "place" },
  { page: "s3-1.5", colour: "planb_light", when: "planb_green_by", note: "what_then" },
];

const colourOf = (raw: string): Light["colour"] => {
  const v = raw.trim().toLowerCase();
  return v.startsWith("green") ? "green" : v.startsWith("amber") ? "amber" : v.startsWith("red") ? "red" : "unknown";
};

/**
 * The five lights.
 *
 * The summary table wins where it was filled in, because that is where the
 * person brought the five together and looked at them side by side. Where a
 * row was left empty, the page behind it answers instead: somebody who set
 * the light on 1.1 to 1.5 and never copied them forward wrote those answers,
 * and a document of five dashes would be the app losing them.
 */
export function lightsOf(a: Answers): Light[] {
  const rows = rowsOf(a, "green_lights", "lights");
  return LIGHT_NAMES.map((name, i) => {
    const summary = colourOf(cell(rows, i, "colour"));
    if (summary !== "unknown") {
      return {
        name,
        colour: summary,
        note: cell(rows, i, "turns_green") || undefined,
        when: cell(rows, i, "by_when") || undefined,
      };
    }
    const page = LIGHT_PAGES[i];
    return {
      name,
      colour: colourOf(text(a, page.page, page.colour)),
      note: (page.note ? text(a, page.page, page.note) : "") || undefined,
      when: text(a, page.page, page.when) || undefined,
    };
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

/** True when the decision on the table is a change at home, not a move. */
export const isStaying = (a: Answers): boolean =>
  /change where i am|where i am|stay/i.test(text(a, "s3-4.2", "decision"));

export function savingsCascade(a: Answers): Cascade | null {
  const rows = rowsOf(a, "s3-1.1", "check_one");
  const at = (i: number) => num(cell(rows, i, "amount"));
  const start = at(0);
  if (start === null) return null;

  const taken = (
    [
      { label: "Deciding costs", amount: at(1) ?? 0, kind: "take" },
      { label: isStaying(a) ? "The change itself" : "Moving costs", amount: at(2) ?? 0, kind: "take" },
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

/**
 * How to attach a "when" to a sentence.
 *
 * The workbook asks for a date, and plenty of people write a period instead:
 * "in the first week", "the third month after the change". "before In the
 * first week" is the app reading its own label out loud, so a value that is
 * not a date is simply put in its own sentence.
 */
const MONTHS = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
export const looksLikeADate = (value: string): boolean => {
  const v = value.trim();
  return /^\d/.test(v) || MONTHS.test(v);
};

/** ", before 14 March" for a date, ". In the first week" for anything else. */
export function whenSuffix(value: string | undefined, preposition: string): string {
  const v = (value ?? "").trim();
  if (!v) return ".";
  return looksLikeADate(v) ? `, ${preposition} ${noStop(v)}.` : `. ${noStop(v)}.`;
}

/**
 * The words a time phrase starts with when it is a period rather than a name:
 * these may be lower-cased mid-sentence, where "Easter" or "March" may not.
 */
const TIME_WORD =
  /^(the|a|an|this|next|early|mid|late|end|start|beginning|first|second|third|fourth|fifth|sixth|within|before|after|around|about|once|when|my|our|spring|summer|autumn|winter|day|days|week|weeks|month|months|year|years|two|three|four|five|six|nine|twelve)\b/i;

const lowerFirst = (v: string) => (TIME_WORD.test(v) ? v[0].toLowerCase() + v.slice(1) : v);

/**
 * "In place by …" with the phrase reading as a phrase.
 *
 * The same fault `whenSuffix` fixes for "before": the workbook asks for a date
 * and people write a period, so "In place by" + "In the fourth month" gives
 * "In place by In the fourth month". A phrase that carries its own "in", "on"
 * or "at" loses it, one that carries "within" or "after" keeps it and drops
 * our "by", and a date is left exactly as written.
 */
export function inPlaceLine(value: string | undefined): string | null {
  const v = noStop((value ?? "").trim());
  if (!v) return null;
  if (looksLikeADate(v)) return `In place by ${v}.`;
  const ownIn = /^(?:in|on|at)\s+(.+)$/i.exec(v);
  if (ownIn) return `In place by ${lowerFirst(ownIn[1])}.`;
  if (/^(?:within|after|before|from|during|by)\s+/i.test(v)) {
    return `In place ${v[0].toLowerCase()}${v.slice(1)}.`;
  }
  return `In place by ${lowerFirst(v)}.`;
}

/**
 * A travel time out of a free-text answer, for the hub of times around the
 * house — which says underneath that these are travel times.
 *
 * Minutes and kilometres mean one thing only. Hours do not: somebody staying
 * where they are answers the work question with their week ("my own job, 32
 * hours instead of 40"), and a hub of journeys must not read that as a journey
 * of thirty-two hours. So hours count only when they could be a journey and
 * the sentence is not about a working week. Nothing to show leaves the tile
 * out, which is honest; inventing a commute would not be.
 */
export function travelTime(answer: string): string | null {
  const aboutWork =
    /\bhours?\b[^.]*\b(?:a|per)\s+week\b|\bhours?\s+instead\s+of\b|\bworking\s+hours?\b|\b(?:days?|hours?)\s+a\s+week\b/i.test(
      answer,
    );
  for (const m of answer.matchAll(/(\d+)\s*(minutes?|mins?|hours?|hrs?|h|km)\b/gi)) {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    if (unit === "km") return `${n} km`;
    if (unit.startsWith("m")) return `${n} min`;
    // Hours: a journey, not a week. Twelve is already a long way to travel.
    if (!aboutWork && n <= 12) return `${n} h`;
  }
  return null;
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
    return {
      label: r.short,
      value: travelTime(answer) ?? "",
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
    /*
     * The date OF the decision, not the date of what it sets off. Those are
     * two different days, and showing the first action twice made the
     * decision and its deadline look like the same moment.
     */
    when: text(a, "s3-0.1", "decide_by") || text(a, "s3-4.2", "first_step_date"),
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

/**
 * The staying route (s3-p5), for somebody whose answer is to change their life
 * where they are.
 *
 * It is an optional part, so the step's result is deliberately taken from Part
 * 4 and not from here — otherwise My Decision would vanish from the document of
 * everybody who is moving. But for the person who stays, this *is* the work,
 * and a result document that left it out would be the document of a decision
 * they did not make. So it is its own sheet, and only when they wrote it.
 */
export type ChangePlan = ReturnType<typeof changePlan>;

export function changePlan(a: Answers) {
  const plan = {
    change: text(a, "change_plan", "the_change"),
    /* Rev.01b: what they hold on to, the test before the change, and the
       part they are honest about not knowing. */
    keep: text(a, "change_plan", "keep"),
    smallTest: text(a, "change_plan", "small_test"),
    uncertain: text(a, "change_plan", "uncertain"),
    inPlace: text(a, "change_plan", "in_place_date"),
    firstThree: lines(text(a, "change_plan", "first_three")),
    incomeBuffer: text(a, "change_plan", "income_buffer"),
    whoITell: text(a, "change_plan", "who_i_tell"),
    first90: text(a, "change_plan", "first_90"),
    planB: text(a, "change_plan", "plan_b"),
    checkIns: text(a, "change_plan", "check_in_dates"),
    /** From 5.3: the hours they decide now, and after the change. */
    hours: text(a, "s3-5.3", "my_choice_hours"),
    /** From 5.1: the steps, planned backwards, where they filled the table in. */
    steps: filledRows(rowsOf(a, "s3-5.1", "steps"))
      .filter((r) => r.row.step?.trim())
      .slice(0, 5)
      .map((r) => ({
        what: r.row.step.trim(),
        when: r.row.start_by?.trim() || undefined,
        note: r.row.first?.trim() || undefined,
      })),
  };
  const written = Boolean(plan.change || plan.firstThree.length || plan.first90 || plan.steps.length);
  return { ...plan, written };
}

/*
 * Roughly how tall this plan prints, in pixels of A4 at 96dpi.
 *
 * Measured against the real sheet rather than guessed: a step row is about
 * 95px, prose runs about half a pixel per character in these two columns, and
 * the kicker, headline, pull quote and footnote are about 140px between them.
 * The body of a sheet holds about 900px once the running head and the page
 * foot have taken theirs.
 */
export function changePlanHeight(plan: ChangePlan): number {
  const prose = [plan.change, plan.inPlace, plan.keep, plan.smallTest, plan.incomeBuffer, plan.hours, plan.whoITell, plan.first90, plan.uncertain, plan.planB]
    .filter(Boolean)
    .join(" ");
  const steps = plan.steps.length > 0 ? plan.steps.length * 95 : plan.firstThree.slice(0, 4).length * 60;
  return 140 + steps + prose.length * 0.5;
}

/** One sheet, or two when it will not fit on one. */
export const changePlanSheets = (plan: ChangePlan): number =>
  !plan.written ? 0 : changePlanHeight(plan) > 900 ? 2 : 1;

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
      three: text(a, "s3-0.1", "decide_by") || text(a, "s3-4.2", "first_step_date"),
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
    /* So the document can name the change this person actually decided on. */
    staying: isStaying(a),
  };
}

export type { MoneyThread };

/* ---------------------------------------------------------------------------
 * Two voices (spec §6.8, slice 3).
 *
 * A household answers the money, the lights and the timeline once, so those
 * parts of a document are the same on both sides already. What differs is the
 * personal half, and that is worth printing twice: a must-have only one of
 * them wrote is still a must-have, and a decision they made together belongs
 * on the page more than either of their own.
 *
 * The second voice only arrives for pages where the comparison is already
 * open, so a page one of them has not finished simply prints one voice.
 * ------------------------------------------------------------------------- */

export type Pair = { name: string; theirs: Answers } | null;

const AGREED = "agreed";

/** What the two of them wrote, and what only one did. */
function bothLists(mine: string[], theirs: string[]) {
  return overlap(mine, theirs);
}

export type Together = ReturnType<typeof togetherReport>;

export function togetherReport(a: Answers, pair: Pair) {
  const theirs = pair?.theirs ?? {};
  const has = (page: string) => Boolean(pair && theirs[page]);

  const mustHavesOf = (from: Answers) =>
    filledRows(rowsOf(from, "1.4", "must_haves"))
      .map((r) => r.row.must_have?.trim() ?? "")
      .filter(Boolean);

  return {
    name: pair?.name ?? null,
    /** The one line they agreed on, which is the point of the two of them. */
    agreedDirection: text(a, "5.1", AGREED),
    agreedDecision: text(a, "s3-4.2", AGREED),
    /** Step 1: the words and the must-haves, side by side. */
    values: has("1.4") ? bothLists(listOf(a, "1.4", "values"), listOf(theirs, "1.4", "values")) : null,
    mustHaves: has("1.4") ? bothLists(mustHavesOf(a), mustHavesOf(theirs)) : null,
    dealbreakers: has("1.4")
      ? { mine: text(a, "1.4", "dealbreakers"), theirs: text(theirs, "1.4", "dealbreakers") }
      : null,
    /** Step 1's own direction, each in their own words. */
    directions: has("5.1") ? { mine: text(a, "5.1", "choice"), theirs: text(theirs, "5.1", "choice") } : null,
    /** Step 2: the question asked on the last evening of the visit. */
    evening: has("s2-4.3")
      ? { mine: text(a, "s2-4.3", "honest_answer"), theirs: text(theirs, "s2-4.3", "honest_answer") }
      : null,
    /** Step 3: what each of them decided, before they agreed anything. */
    decisions: has("s3-4.2")
      ? {
          mine: { what: text(a, "s3-4.2", "decision"), why: text(a, "s3-4.2", "because") },
          theirs: { what: text(theirs, "s3-4.2", "decision"), why: text(theirs, "s3-4.2", "because") },
        }
      : null,
  };
}

/** Is there anything of the other person to print at all? */
export const hasSecondVoice = (t: Together) =>
  Boolean(t.values || t.mustHaves || t.directions || t.evening || t.decisions);

/** Both names, for the cover and the foot: "Mwata and Renata". */
export const bothNames = (mine: string, theirs: string | null) =>
  theirs ? `${mine} and ${theirs}` : mine;

/* ────────────────────── the staying route, in Step 2 ────────────────────── */

export type ExploreStaying = ReturnType<typeof exploreStaying>;

/**
 * My Explore Summary (staying), from S7 (workbook Rev.01c).
 *
 * The same rule as everywhere else in this file: every word is the person's
 * own, and a page they did not write produces no sheet at all.
 */
export function exploreStaying(a: Answers) {
  const f = (field: string) => text(a, "s2-s7", field);
  const plan = {
    change: f("change") || text(a, "s2-s1", "change"),
    gives: f("gives_keeps") || text(a, "s2-s1", "gives"),
    reasons: f("reasons"),
    notGive: f("not_give") || text(a, "s2-s1", "still_hard"),
    money: f("money"),
    rules: f("rules"),
    hours: f("hours"),
    people: f("people"),
    test: f("test") || text(a, "s2-s6", "confirmed"),
    unknowns: f("unknowns"),
    choice: f("choice"),
    nextStep: f("next_step"),
    reviewWhen: f("review_when"),
  };
  const written = Boolean(plan.change || plan.reasons || plan.test || plan.choice);
  return { ...plan, written };
}

/** One sheet or two, or none when nobody took the staying path. */
export const exploreStayingSheets = (plan: ExploreStaying): number => (plan.written ? 2 : 0);
