/**
 * My Blueprint, Phase 1 (spec §6.5).
 *
 * The document holds the three step results, and three things the person has
 * never seen: their decision on one page, their money from first guess to
 * checked figure, and the places where two things they wrote themselves do not
 * yet agree.
 *
 * Everything here is a **rule over their own answers**. Nothing is written by
 * an AI and nothing is advice: each line is their words, their numbers, or a
 * comparison between two things they wrote weeks apart. This document leaves
 * the app and gets shown to partners and advisers, so it may never say
 * anything that could be wrong.
 *
 * Nothing is imported but the money arithmetic, so the rules can be tested on
 * their own.
 */
import { parseAmount, tableTotal } from "./money.ts";

export type Answers = Record<string, Record<string, unknown> | undefined>;

const text = (answers: Answers, page: string, field: string): string => {
  const v = answers[page]?.[field];
  return typeof v === "string" ? v.trim() : "";
};

type Rows = Record<string, Record<string, string> | undefined>;
const rowsOf = (answers: Answers, page: string, field: string): Rows =>
  (answers[page]?.[field] as Rows | undefined) ?? {};

/** A number the person typed, or null when they left it empty or wrote "unknown". */
const amount = (raw: unknown): number | null => {
  const a = parseAmount(raw);
  return a.kind === "number" ? a.value : null;
};

/**
 * A total, counted exactly as the app's own screen counts it.
 *
 * Two rules, both of them the workbook's, and both of them easy to lose here
 * because this file never sees the content:
 *
 *   - an "unknown" row makes the total **incomplete**. The screen says
 *     "EUR 900 + unknown — not complete yet", so this document may not say
 *     "EUR 900" as though it were the whole answer.
 *   - income counts **confirmed and agreed** only (3.4's own total_filter).
 *     Hoped income is not income. Counting it flips the sign of the month.
 *
 * These mirror `total_filter` and the certainty column in step1-content.json.
 * If those change, change these — the test below is what will tell you.
 */
type Sum = { value: number | null; complete: boolean };

const EMPTY: Sum = { value: null, complete: true };

const total = (
  answers: Answers,
  page: string,
  field: string,
  column: string,
  options: { certaintyColumn?: string; filter?: { column: string; values: string[] } } = {},
): Sum => {
  const t = tableTotal(answers[page]?.[field], column, options);
  return t.filled > 0 ? { value: t.value, complete: t.complete } : EMPTY;
};

/** Only income you have evidence for, as the workbook says in every step. */
const INCOME_ONLY_CONFIRMED = { column: "certainty", values: ["Confirmed", "Agreed"] };

/* ─────────────────────────── which steps are finished ─────────────────── */

export type StepState = { step: 1 | 2 | 3; finished: boolean };

/** A step counts as finished once its result page has been written in. */
export function stepsFinished(answers: Answers): StepState[] {
  return [
    { step: 1, finished: text(answers, "5.1", "life_picture") !== "" || text(answers, "5.1", "directions") !== "" },
    { step: 2, finished: text(answers, "s2-5.1", "place") !== "" },
    { step: 3, finished: text(answers, "s3-4.2", "decision") !== "" },
  ];
}

/* ───────────────────────────── the decision in one page ───────────────── */

export type Headline = {
  decision: string;
  question: string;
  conditions: string;
  place: string;
  where: string;
  firstStep: string;
  firstStepDate: string;
  reviewWhen: string;
  reasons: string;
};

export function headline(answers: Answers): Headline {
  return {
    decision: text(answers, "s3-4.2", "decision"),
    question: text(answers, "s3-4.2", "question") || text(answers, "s3-0.1", "the_option"),
    conditions: text(answers, "s3-4.2", "conditions"),
    place: text(answers, "s2-5.1", "place"),
    where: text(answers, "s2-5.1", "where"),
    firstStep: text(answers, "s3-4.2", "first_step"),
    firstStepDate: text(answers, "s3-4.2", "first_step_date"),
    reviewWhen: text(answers, "s3-4.2", "review_when"),
    reasons: text(answers, "s3-4.2", "reasons"),
  };
}

/* ───────────────────────────────── the five lights ────────────────────── */

export type Light = { name: string; colour: string; turnsGreen: string; byWhen: string };

const LIGHT_NAMES = ["Money", "Papers", "People", "Place", "Plan B"];

export function lights(answers: Answers): Light[] {
  const rows = rowsOf(answers, "green_lights", "lights");
  return LIGHT_NAMES.map((name, i) => ({
    name,
    colour: (rows[`r${i}`]?.colour ?? "").trim(),
    turnsGreen: (rows[`r${i}`]?.turns_green ?? "").trim(),
    byWhen: (rows[`r${i}`]?.by_when ?? "").trim(),
  }));
}

/* ─────────────────────────────── the money thread ─────────────────────── */

export type MoneyThread = {
  /** What Step 1 guessed a month would cost. */
  guessed: number | null;
  /** What Step 2 found, against real prices. */
  found: number | null;
  /**
   * False when any figure behind these numbers is still "unknown". The
   * document then says so, instead of printing a part-total as a fact.
   */
  complete: boolean;
  /** How far apart they are, as a whole percentage of the guess. */
  differencePercent: number | null;
  /** Over the workbook's own threshold, which asks you to go back through both. */
  overTwentyPercent: boolean;
  /** Income the person can count on, from Step 1's table. */
  income: number | null;
  /** Left over (positive) or short (negative) each month, against the checked costs. */
  balance: number | null;
  /** What Step 3 says they can reach within a month. */
  savings: number | null;
  /** How long the savings cover the shortfall, in whole months. */
  runwayMonths: number | null;
};

export function moneyThread(answers: Answers): MoneyThread {
  const guessed = total(answers, "3.2", "costs", "new_life", { certaintyColumn: "certainty" });
  const found = total(answers, "s2-3.1", "costs", "found");
  const income = total(answers, "3.4", "income", "new_life", { filter: INCOME_ONLY_CONFIRMED });
  const savings = amount(answers["s3-0.1"]?.savings_reachable);

  const complete = guessed.complete && found.complete && income.complete;

  const differencePercent =
    guessed.value !== null && found.value !== null && guessed.value > 0
      ? Math.round(((found.value - guessed.value) / guessed.value) * 100)
      : null;

  // The month is measured against the checked figure where there is one: the
  // later number is the better one, and that is the whole point of Step 2.
  const monthly = found.value ?? guessed.value;
  const balance = income.value !== null && monthly !== null ? income.value - monthly : null;

  // A runway worked out from half a total is worse than no runway at all, so
  // it is only stated when every figure behind it is known.
  const runwayMonths =
    complete && savings !== null && balance !== null && balance < 0 ? Math.floor(savings / -balance) : null;

  return {
    guessed: guessed.value,
    found: found.value,
    complete,
    differencePercent: complete ? differencePercent : null,
    overTwentyPercent: complete && differencePercent !== null && Math.abs(differencePercent) > 20,
    income: income.value,
    balance: complete ? balance : null,
    savings,
    runwayMonths,
  };
}

/** A figure as the person would read it, with their own currency in front. */
const amountText = (n: number | null, currency: string) =>
  n === null ? "—" : `${currency ? currency + " " : ""}${Math.round(n).toLocaleString()}`;

/* ────────────────────────── what does not line up yet ─────────────────── */

export type Flag = {
  /** "amber" is something to settle; "green" is a check that passed. */
  tone: "amber" | "red" | "green";
  title: string;
  quote: string;
  where: string;
};

/**
 * Comparisons, never judgements. Each one holds two things the person wrote
 * themselves, so it can be shown to them without an argument.
 */
export function whatDoesNotLineUp(answers: Answers, currency = ""): Flag[] {
  const out: Flag[] = [];
  const money = moneyThread(answers);

  if (money.overTwentyPercent && money.differencePercent !== null) {
    const more = money.differencePercent > 0;
    out.push({
      tone: "amber",
      title: `Your checked costs are ${Math.abs(money.differencePercent)}% ${more ? "higher" : "lower"} than your first guess`,
      quote: `Step 1 said about ${amountText(money.guessed, currency)}. Step 2 found ${amountText(money.found, currency)}.`,
      where: "Step 2 asks you to go back through both sets of figures when they differ by more than 20%",
    });
  }

  for (const light of lights(answers)) {
    const colour = light.colour.toLowerCase();
    if (colour === "red") {
      out.push({
        tone: "red",
        title: `${light.name} is a red light`,
        quote: light.turnsGreen || "Nothing written down yet about what would change it.",
        where: "Step 3 · 1.1 to 1.5 — a red light blocks this option as it stands",
      });
    } else if (colour === "amber" && light.byWhen === "") {
      out.push({
        tone: "amber",
        title: `${light.name} is amber, without a date`,
        quote: light.turnsGreen || "No next action written down yet.",
        where: "Step 3 · Part 1 — an amber light needs a next action and a date",
      });
    }
  }

  // A must-have this option does not meet, in the person's own last check.
  const check = rowsOf(answers, "s3-4.1", "check");
  const broken = Object.values(check).filter((r) => (r?.meets ?? "").toLowerCase() === "no" && (r?.item ?? "").trim());
  for (const row of broken) {
    out.push({
      tone: "red",
      title: "Something on your list this option does not meet",
      quote: row!.item,
      where: "Step 3 · 4.1 — a broken dealbreaker ends this option, whatever the other lights say",
    });
  }
  const checked = Object.values(check).filter((r) => (r?.item ?? "").trim() && (r?.meets ?? "").trim());
  if (checked.length > 0 && broken.length === 0) {
    out.push({
      tone: "green",
      title: "Nothing on your list is broken",
      quote: `All ${checked.length} you checked are met, or partly met.`,
      where: "Step 3 · 4.1 — checked against the list you wrote in Step 1",
    });
  }

  // An unknown carried all the way from Step 2.
  const unknowns = text(answers, "s2-5.1", "unknowns");
  if (unknowns) {
    out.push({
      tone: "amber",
      title: "An unknown you carried through",
      quote: unknowns,
      where: "Step 2 · My Explore Summary — still written down as unknown",
    });
  }

  // "Go" with nothing named that has to be true first.
  if (text(answers, "s3-4.2", "decision").toLowerCase() === "go" && text(answers, "s3-4.2", "conditions") === "") {
    out.push({
      tone: "amber",
      title: "A go with no conditions written down",
      quote: "Nothing is named that must be true before the hard-to-undo steps.",
      where: "Step 3 · 4.2 — a go with conditions is the safer kind",
    });
  }

  return out;
}

/* ──────────────────────────── what happens next ───────────────────────── */

export type Next = { when: string; what: string; where: string };

/** Their own dates, gathered from wherever they wrote them. */
export function whatHappensNext(answers: Answers): Next[] {
  const out: Next[] = [];
  const add = (when: string, what: string, where: string) => {
    if (when.trim() && what.trim()) out.push({ when: when.trim(), what: what.trim(), where });
  };

  add(
    text(answers, "s3-4.2", "first_step_date"),
    text(answers, "s3-4.2", "first_step"),
    "your first step · Step 3 · 4.2",
  );

  for (const light of lights(answers)) {
    add(light.byWhen, light.turnsGreen, `${light.name} · Step 3 · Part 1`);
  }

  for (const row of Object.values(rowsOf(answers, "s3-3.1", "steps"))) {
    add(row?.when ?? "", row?.step ?? "", "your timeline · Step 3 · 3.1");
  }

  add(
    text(answers, "s2-5.1", "date"),
    text(answers, "s2-5.1", "next_step"),
    "your next small step · Step 2 · My Explore Summary",
  );

  add(
    text(answers, "s3-4.2", "review_when"),
    "Look at this decision again, whatever has happened",
    "your review date · Step 3 · 4.2",
  );

  return out;
}

/* ───────────────────────────── what changed along the way ─────────────── */

export type Change = { label: string; text: string };

export function whatChanged(answers: Answers): Change[] {
  const out: Change[] = [];
  const picture = text(answers, "5.1", "life_picture");
  const place = text(answers, "s2-5.1", "place");
  const decision = text(answers, "s3-4.2", "decision");
  if (picture) out.push({ label: "In Step 1 you wanted", text: picture });
  if (place) out.push({ label: "In Step 2 you chose", text: place });
  if (decision) out.push({ label: "In Step 3 you decided", text: decision });
  return out;
}
