/**
 * Which pages add up money.
 *
 * The lawyer's note of 24 October has to appear on every money check. A list
 * of page ids would be wrong the first time a workbook changed, so the page
 * says it itself: a money column, or a sum formatted as money.
 *
 * Nothing is imported here, and the shape it asks for is the smallest one
 * that answers the question, so the rule can be tested on its own with the
 * real content.
 */

type MoneyShape = {
  start_here?: { fields?: unknown[] };
  go_deeper?: { fields?: unknown[] };
  /** The spine flattens a page's fields into one list. */
  fields?: unknown[];
};

type Field = {
  type?: string;
  columns?: { kind?: string }[];
  rows?: unknown;
};

const isMoney = (field: unknown): boolean => {
  const f = field as Field;
  if ((f.columns ?? []).some((c) => c.kind === "money")) return true;
  if (f.type !== "calculation" || !Array.isArray(f.rows)) return false;
  return (f.rows as { format?: string; input?: string }[]).some((r) => r.format === "money" || r.input === "money");
};

/** True when this page works something out from money the person typed. */
export function countsMoney(page: MoneyShape): boolean {
  const fields = [...(page.start_here?.fields ?? []), ...(page.go_deeper?.fields ?? []), ...(page.fields ?? [])];
  return fields.some(isMoney);
}
