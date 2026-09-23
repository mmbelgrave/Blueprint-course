// Turns saved answers into plain, readable text using the labels from the
// content. Used by the AI partner (context) and by "Copy from Step 1".
import { exerciseFields, findExercise, tableRows, type CalcRow, type Field } from "@/lib/content";

const MAX_ANSWER_CHARS = 2000;

function clip(s: string) {
  return s.length > MAX_ANSWER_CHARS ? `${s.slice(0, MAX_ANSWER_CHARS)}… (shortened)` : s;
}

/**
 * One table cell as the person sees it: their text, or — in the first column —
 * the starting text the workbook gives (4.1: "Change nothing"), shown in the
 * box even when they did not type there.
 */
function cell(field: Field, row: Record<string, string>, colId: string, colIndex: number, rowLabel?: string) {
  const typed = row[colId]?.trim();
  if (typed) return typed;
  if (row[colId] === undefined && colIndex === 0 && rowLabel) {
    const start = field.prefill?.[rowLabel]?.trim() ?? "";
    // "Stay — but change:" is only the start of a sentence, not an answer.
    return start.endsWith(":") ? "" : start;
  }
  return "";
}

/** One answer in plain words, or null when empty. `separator` joins rows/items. */
export function answerText(field: Field, value: unknown, separator = "; "): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string") return value.trim() ? clip(value.trim()) : null;
  if (Array.isArray(value)) {
    if (field.type === "yes_no") {
      const lines = (field.questions ?? []).map((q, i) => (value[i] ? `${q} → ${value[i]}` : null));
      return lines.filter(Boolean).join(separator) || null;
    }
    const items = value.filter((v) => typeof v === "string" && v.trim());
    return items.length ? clip(items.join(separator)) : null;
  }
  if (typeof value === "object") {
    const data = value as Record<string, unknown>;
    if (field.type === "calculation") {
      const rows = (Array.isArray(field.rows) ? field.rows : []) as CalcRow[];
      const lines = rows
        .filter((r) => r.input && String(data[r.id] ?? "").trim())
        .map((r) => `${r.label}: ${data[r.id]}`);
      return lines.length ? lines.join(separator) : null;
    }
    // Table: one line per filled row.
    const cols = field.columns ?? [];
    const known = tableRows(field);
    const rows = known.concat(
      Object.keys(data)
        .filter((k) => !known.some((r) => r.key === k))
        .map((k) => ({ key: k, label: undefined })),
    );
    const lines: string[] = [];
    for (const { key, label } of rows) {
      const row = (data[key] ?? {}) as Record<string, string>;
      const cells = cols
        .map((c, i) => {
          const v = cell(field, row, c.id, i, label);
          return v ? `${cols.length > 1 ? `${c.label}: ` : ""}${v}` : null;
        })
        .filter(Boolean);
      if (cells.length) lines.push(`${label ? `${label} — ` : ""}${cells.join(", ")}`);
    }
    return lines.length ? clip(lines.join(separator === "; " ? " | " : separator)) : null;
  }
  return String(value);
}

/** One field of another exercise as text (for "Copy from Step 1"). */
export function fieldAnswerText(exerciseId: string, fieldId: string, values: Record<string, unknown> | undefined) {
  const found = findExercise(exerciseId);
  const field = found && exerciseFields(found.exercise).find((f) => f.id === fieldId);
  if (!field || !values) return null;
  // Tables and lists become one line per row, which reads well in a text box.
  if (field.type === "table") {
    const data = (values[fieldId] ?? {}) as Record<string, Record<string, string>>;
    if (!values[fieldId]) return null;
    const lines = tableRows(field)
      .map(({ key, label }) =>
        (field.columns ?? [])
          .map((c, i) => cell(field, data[key] ?? {}, c.id, i, label))
          .filter(Boolean)
          .join(" — "),
      )
      .filter(Boolean);
    return lines.length ? lines.join("\n") : null;
  }
  return answerText(field, values[fieldId], "\n");
}

/** All answers of one exercise as readable lines, or null if empty. */
export function exerciseAnswersText(exerciseId: string, values: Record<string, unknown> | undefined) {
  const found = findExercise(exerciseId);
  if (!found || !values) return null;
  const lines: string[] = [];
  for (const field of exerciseFields(found.exercise)) {
    const text = answerText(field, values[field.id]);
    if (text) lines.push(`- ${field.label ?? field.hint ?? field.id}: ${text}`);
  }
  return lines.length ? lines.join("\n") : null;
}
