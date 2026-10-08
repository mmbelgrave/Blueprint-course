"use client";
// App-calculated extras for fields: rows taken from earlier answers, option
// names from 4.1, and the 3.5 calculation (see rows_from / app_note / calculation).
import { tableFieldTotal, type FieldExtras, type TableValue } from "@/components/fields";
import { fieldAnswerText } from "@/lib/answer-text";
import type { Answers } from "@/lib/backend";
import { exerciseFields, findExercise, tableRows, type CalcRow, type Exercise, type Field } from "@/lib/content";
import { evaluate, parseAmount, tableTotal, type CalcResult } from "@/lib/money";

function sourceField(exerciseId: string, fieldId: string): Field | undefined {
  const ex = findExercise(exerciseId)?.exercise;
  return ex ? exerciseFields(ex).find((f) => f.id === fieldId) : undefined;
}

/** Option names from 4.1 (A–D), falling back to the prefilled texts. */
export function optionNames(answers: Answers): Record<string, string> {
  const field = sourceField("4.1", "options");
  if (!field) return {};
  const data = (answers["4.1"]?.options ?? {}) as TableValue;
  const names: Record<string, string> = {};
  for (const { key, label } of tableRows(field)) {
    const name = (data[key]?.option ?? field.prefill?.[label ?? ""] ?? "").trim();
    names[label!] = name;
  }
  return names;
}

/** One cell of a table elsewhere, found by its row label. */
function oneRow(from: NonNullable<CalcRow["from"]>, answers: Answers): CalcResult {
  const src = sourceField(from.exercise, from.field);
  const key = src && tableRows(src).find((r) => r.label === from.row)?.key;
  const table = answers[from.exercise]?.[from.field] as TableValue | undefined;
  const a = parseAmount(key ? table?.[key]?.[from.column] : undefined);
  return a.kind === "number" ? { value: a.value, complete: true } : { value: null, complete: a.kind === "empty" };
}

function calculate(exercise: Exercise, answers: Answers) {
  const vars: Record<string, CalcResult> = {};
  const out: Record<string, CalcResult & { visible: boolean }> = {};
  const values = answers[exercise.id] ?? {};
  const rowsWithField = exerciseFields(exercise)
    .filter((f) => f.type === "calculation")
    .flatMap((f) => ((f.rows ?? []) as CalcRow[]).map((row) => ({ row, fieldId: f.id })));

  for (const { row, fieldId } of rowsWithField) {
    let r: CalcResult;
    if (row.from?.row) {
      r = oneRow(row.from, answers);
    } else if (row.from) {
      const src = sourceField(row.from.exercise, row.from.field);
      const t = src
        ? tableFieldTotal(src, answers[row.from.exercise]?.[row.from.field], row.from.column)
        : tableTotal(undefined, row.from.column);
      r = { value: t.filled ? t.value : null, complete: t.complete };
    } else if (row.input) {
      const a = parseAmount((values[fieldId] as Record<string, string> | undefined)?.[row.id]);
      r = a.kind === "number" ? { value: a.value, complete: true } : { value: null, complete: a.kind === "empty" };
    } else {
      r = evaluate(row.formula ?? "0", vars);
    }
    vars[row.id] = r;
    const visible = row.condition ? evaluate(row.condition, vars).value === 1 : true;
    out[row.id] = { ...r, visible };
  }
  return out;
}

/** Returns the extras for each field of this exercise. */
export function fieldExtras(
  exercise: Exercise,
  answers: Answers,
  /**
   * The fields this page offers to copy forward, sent with the page by
   * /api/content and keyed "5.1.life_picture". The browser does not hold the
   * other step, so without these there is nothing to read the answer with.
   */
  sources: Record<string, Field> = {},
): (field: Field) => FieldExtras | undefined {
  const names = optionNames(answers);
  const withName = (letter: string) => (names[letter] ? `${letter} — ${names[letter]}` : letter);
  const calc = calculate(exercise, answers);

  return (field) => {
    if (field.type === "calculation") return { calc };
    if (field.copy_from) {
      const { exercise: from, field: fromField } = field.copy_from;
      const source = sources[`${from}.${fromField}`];
      // A field on its own is enough to read one answer back, so it is wrapped
      // in the smallest page that will hold it rather than fetching the rest.
      const asPage = source ? ({ id: from, title: "", start_here: { fields: [source] } } as Exercise) : undefined;
      const text = fieldAnswerText(from, fromField, answers[from], asPage);
      return text ? { suggestion: { title: "From your Step 1:", text, button: "Copy this in" } } : undefined;
    }
    if (field.type !== "table") return undefined;
    const extras: FieldExtras = {};

    // "Country 1:" + the name the person wrote in the list field.
    if (field.column_names_from) {
      const names = (answers[exercise.id]?.[field.column_names_from.field] ?? []) as string[];
      extras.columnLabels = Object.fromEntries(
        (field.columns ?? []).map((c, i) => [c.id, names[i]?.trim() ? `${c.label} ${names[i].trim()}` : c.label]),
      );
    }

    if (field.rows_from) {
      const src = sourceField(field.rows_from.exercise, field.rows_from.field);
      const data = (answers[field.rows_from.exercise]?.[field.rows_from.field] ?? {}) as TableValue;
      const count = Math.max(typeof field.rows === "number" ? field.rows : 0, src ? tableRows(src).length : 0);
      extras.rowCount = count;
      extras.rowLabels = {};
      for (let i = 0; i < count; i++) {
        extras.rowLabels[`r${i}`] = data[`r${i}`]?.[field.rows_from.column]?.trim() || `Must-have ${i + 1}`;
      }
    }

    // Step 1 4.2: show the option names from 4.1 next to A–D.
    if (exercise.id === "4.2") {
      if (field.row_labels) {
        extras.rowLabels = Object.fromEntries(field.row_labels.map((l, i) => [`r${i}`, withName(l)]));
      }
      extras.columnLabels = Object.fromEntries(
        (field.columns ?? []).filter((c) => /^[A-D]$/.test(c.label)).map((c) => [c.id, withName(c.label)]),
      );
    }
    return extras;
  };
}
