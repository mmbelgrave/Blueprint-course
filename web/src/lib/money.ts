// Money rules from the workbook (Part 3): amounts may be "unknown", and an
// unknown amount makes a total "not complete yet" — it never counts as zero.
import { toNumber } from "./numbers.ts";

export type Amount = { kind: "empty" } | { kind: "unknown" } | { kind: "number"; value: number };

/** "" -> empty; text without any digit ("?", "unknown", "no idea") -> unknown. */
export function parseAmount(v: unknown): Amount {
  const s = String(v ?? "").trim();
  if (!s) return { kind: "empty" };
  if (!/\d/.test(s)) return { kind: "unknown" };
  return { kind: "number", value: toNumber(s) };
}

/** value = sum of known numbers; complete = false when anything is unknown. */
export type Total = { value: number; complete: boolean; filled: number };

type Rows = Record<string, Record<string, string> | undefined>;

export function tableTotal(
  table: unknown,
  columnId: string,
  options: { filter?: { column: string; values: string[] }; certaintyColumn?: string } = {},
): Total {
  const rows = (table ?? {}) as Rows;
  let value = 0;
  let complete = true;
  let filled = 0;
  for (const row of Object.values(rows)) {
    if (!row) continue;
    const amount = parseAmount(row[columnId]);
    const mark = options.certaintyColumn ? row[options.certaintyColumn] : undefined;
    if (options.filter) {
      if (amount.kind === "empty") continue;
      // An amount that is not marked yet: we cannot know if it counts.
      if (!mark) {
        complete = false;
        continue;
      }
      if (!options.filter.values.includes(mark)) continue;
    }
    if (amount.kind === "number") {
      value += amount.value;
      filled++;
    } else if (amount.kind === "unknown" || (amount.kind === "empty" && mark === "Unknown")) {
      complete = false;
      filled++;
    }
  }
  return { value, complete, filled };
}

// ---------- 3.5: a small, safe formula evaluator (no eval) ----------

export type CalcResult = { value: number | null; complete: boolean };

type Token = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

function tokenize(src: string): Token[] {
  const s = src.trim();
  const out: Token[] = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(<=|>=|[-+*/()<>]))/y;
  while (re.lastIndex < s.length) {
    const m = re.exec(s);
    if (!m) throw new Error(`Bad formula: ${src}`);
    if (m[1]) out.push({ t: "num", v: parseFloat(m[1]) });
    else if (m[2]) out.push({ t: "id", v: m[2] });
    else out.push({ t: "op", v: m[3] });
  }
  return out;
}

/** Evaluates "a - b / -c" or "a < 0" against named results. */
export function evaluate(src: string, vars: Record<string, CalcResult>): CalcResult {
  const tokens = tokenize(src);
  let i = 0;
  let complete = true;
  const peek = () => tokens[i];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;
  const combine = (a: number | null, b: number | null, f: (x: number, y: number) => number | null) =>
    a === null || b === null ? null : f(a, b);

  function primary(): number | null {
    const tok = tokens[i++];
    if (!tok) throw new Error(`Bad formula: ${src}`);
    if (tok.t === "num") return tok.v;
    if (tok.t === "id") {
      const r = vars[tok.v];
      if (!r) throw new Error(`Unknown name "${tok.v}" in ${src}`);
      if (!r.complete) complete = false;
      return r.value;
    }
    if (tok.v === "(") {
      const v = expr();
      i++; // ")"
      return v;
    }
    if (tok.v === "-") {
      const v = primary();
      return v === null ? null : -v;
    }
    throw new Error(`Bad formula: ${src}`);
  }
  function term(): number | null {
    let v = primary();
    while (isOp("*") || isOp("/")) {
      const op = tokens[i++].v;
      const r = primary();
      v = combine(v, r, (x, y) => (op === "*" ? x * y : y === 0 ? null : x / y));
    }
    return v;
  }
  function expr(): number | null {
    let v = term();
    while (isOp("+") || isOp("-")) {
      const op = tokens[i++].v;
      const r = term();
      v = combine(v, r, (x, y) => (op === "+" ? x + y : x - y));
    }
    return v;
  }
  function comparison(): number | null {
    const left = expr();
    for (const op of ["<=", ">=", "<", ">"]) {
      if (isOp(op)) {
        i++;
        const right = expr();
        return combine(left, right, (x, y) =>
          (op === "<" ? x < y : op === ">" ? x > y : op === "<=" ? x <= y : x >= y) ? 1 : 0,
        );
      }
    }
    return left;
  }
  const value = comparison();
  return { value, complete };
}
