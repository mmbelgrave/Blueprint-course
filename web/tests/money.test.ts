import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate, parseAmount, tableTotal } from "../src/lib/money.ts";

test("parseAmount: empty, unknown, number", () => {
  assert.deepEqual(parseAmount(""), { kind: "empty" });
  assert.deepEqual(parseAmount("?"), { kind: "unknown" });
  assert.deepEqual(parseAmount("unknown"), { kind: "unknown" });
  assert.deepEqual(parseAmount("€1.200"), { kind: "number", value: 1200 });
});

test("an unknown amount makes the total incomplete, never zero", () => {
  const t = tableTotal({ r0: { new_life: "900" }, r1: { new_life: "?" }, r2: { new_life: "" } }, "new_life");
  assert.deepEqual(t, { value: 900, complete: false, filled: 2 });
});

test("empty amount marked Unknown also makes the total incomplete", () => {
  const t = tableTotal(
    { r0: { new_life: "900", certainty: "Known" }, r1: { new_life: "", certainty: "Unknown" } },
    "new_life",
    { certaintyColumn: "certainty" },
  );
  assert.equal(t.complete, false);
  assert.equal(t.value, 900);
});

test("3.4: only confirmed or agreed income counts", () => {
  const income = {
    r0: { new_life: "1000", certainty: "Confirmed" },
    r1: { new_life: "500", certainty: "Agreed" },
    r2: { new_life: "700", certainty: "Hoped" },
  };
  const t = tableTotal(income, "new_life", {
    filter: { column: "certainty", values: ["Confirmed", "Agreed"] },
    certaintyColumn: "certainty",
  });
  assert.deepEqual(t, { value: 1500, complete: true, filled: 2 });
});

test("3.4: an amount without a mark makes the total incomplete", () => {
  const t = tableTotal({ r0: { new_life: "1000", certainty: "Confirmed" }, r1: { new_life: "300" } }, "new_life", {
    filter: { column: "certainty", values: ["Confirmed", "Agreed"] },
    certaintyColumn: "certainty",
  });
  assert.equal(t.value, 1000);
  assert.equal(t.complete, false);
});

const n = (value: number | null, complete = true) => ({ value, complete });

test("3.5 workbook example: 500 short, 16,000 left, 32 months", () => {
  const vars: Record<string, { value: number | null; complete: boolean }> = {
    income: n(1800),
    costs: n(2300),
    savings: n(30000),
    one_time: n(5000),
    deposits: n(3000),
    reserve: n(6000),
  };
  vars.balance = evaluate("income - costs", vars);
  assert.deepEqual(vars.balance, n(-500));
  vars.available = evaluate("savings - one_time - deposits - reserve", vars);
  assert.deepEqual(vars.available, n(16000));
  assert.deepEqual(evaluate("available / -balance", vars), n(32));
  assert.deepEqual(evaluate("balance < 0", vars), n(1));
});

test("missing and incomplete inputs flow through", () => {
  assert.deepEqual(evaluate("a - b", { a: n(5), b: n(null) }), n(null));
  assert.deepEqual(evaluate("a - b", { a: n(5), b: n(2, false) }), n(3, false));
  assert.deepEqual(evaluate("a / b", { a: n(5), b: n(0) }), n(null));
});
