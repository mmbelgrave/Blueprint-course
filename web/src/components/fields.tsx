"use client";
// Renders one answer field from step1-content.json, for every field type.
import { useState } from "react";
import { tableRows, type CalcRow, type Field, type TableColumn } from "@/lib/content";
import { tableTotal, type CalcResult, type Total } from "@/lib/money";

export type TableValue = Record<string, Record<string, string>>;

/** Extra, app-calculated information for some fields (see useFieldExtras). */
export type FieldExtras = {
  /** Replaces or adds row labels (for example option names, must-haves from 1.4). */
  rowLabels?: Record<string, string>;
  /** Replaces column labels (for example A–D with option names). */
  columnLabels?: Record<string, string>;
  /** Shows at least this many rows. */
  rowCount?: number;
  /** Results of a calculation field, by row id. */
  calc?: Record<string, CalcResult & { visible: boolean }>;
  /**
   * A text offered to put in the box — the person's own Step 1 answer, or an
   * AI partner draft. Nothing is filled in without a click.
   */
  suggestion?: {
    title: string;
    text: string;
    button: string;
    /** When set, the suggestion also shows when the box already has text. */
    replaceButton?: string;
  } | null;
};

type FieldProps = {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  currency: string;
  extras?: FieldExtras;
};

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

/** Totals follow the workbook rule: an unknown never counts as zero. */
export function tableFieldTotal(field: Field, value: unknown, columnId: string): Total {
  const certainty = field.columns?.find((c) => c.id === "certainty") ? "certainty" : undefined;
  return tableTotal(value, columnId, { filter: field.total_filter, certaintyColumn: certainty });
}

export function formatTotal(t: Total, currency: string) {
  if (t.filled === 0) return "—";
  return t.complete ? formatMoney(t.value, currency) : `${formatMoney(t.value, currency)} + unknown`;
}

function isEmpty(value: unknown) {
  return value === undefined || value === null || (typeof value === "string" && !value.trim());
}

export function FieldInput(props: FieldProps) {
  const { field, value, onChange, extras } = props;
  const s = extras?.suggestion;
  const empty = isEmpty(value);
  const showSuggestion = s && s.text && (empty || (s.replaceButton && value !== s.text));
  return (
    <div className="space-y-2">
      {field.marker ? (
        <p className="flex items-center gap-3 pt-2 text-lg font-semibold text-indigo">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber text-xl font-bold text-white"
          >
            {field.marker}
          </span>
          <span>
            <span className="sr-only">{field.marker}. </span>
            {field.label}
          </span>
        </p>
      ) : (
        field.label && <p className="font-medium">{field.label}</p>
      )}
      {field.hint && <p className="text-muted">{field.hint}</p>}
      {field.type !== "heading" && <Control {...props} />}
      {showSuggestion && (
        <div className="flex flex-wrap items-start gap-3 rounded-lg bg-sand p-3 text-sm">
          <p className="min-w-0 flex-1 whitespace-pre-line">
            <span className="font-semibold">{s.title} </span>
            {s.text}
          </p>
          <button type="button" className="btn btn-ghost py-1 text-sm" onClick={() => onChange(s.text)}>
            {empty ? s.button : s.replaceButton}
          </button>
        </div>
      )}
    </div>
  );
}

function Control({ field, value, onChange, currency, extras }: FieldProps) {
  switch (field.type) {
    case "long_text":
      return (
        <textarea
          aria-label={field.label ?? field.hint ?? field.id}
          className="field-input resize-y"
          rows={Math.max(2, field.lines ?? 3)}
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "short_text":
      return (
        <input
          aria-label={field.label ?? field.id}
          className="field-input"
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "number":
      return (
        <div className="flex items-center gap-2">
          <input
            aria-label={field.label ?? field.id}
            inputMode="decimal"
            className="field-input max-w-[8rem]"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.unit && <span className="text-muted">{field.unit}</span>}
        </div>
      );

    case "list": {
      const saved = Array.isArray(value) ? (value as string[]) : [];
      const items = Array.from({ length: field.count ?? 3 }, (_, i) => saved[i] ?? "");
      return (
        <ol className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="w-5 text-right text-muted">{i + 1}.</span>
              <input
                aria-label={`${field.item_label ?? field.label ?? field.hint ?? field.id} ${i + 1}`}
                placeholder={field.item_label ? `${field.item_label} ${i + 1}` : undefined}
                className="field-input"
                value={item}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  onChange(next);
                }}
              />
            </li>
          ))}
        </ol>
      );
    }

    case "single_choice":
      return (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={field.label}>
          {field.options?.map((opt) => (
            <Chip key={opt} radio selected={value === opt} onClick={() => onChange(value === opt ? "" : opt)}>
              {opt}
            </Chip>
          ))}
        </div>
      );

    case "yes_no": {
      const options = field.options ?? ["Yes", "No"];
      const answers = Array.isArray(value) ? (value as (string | null)[]) : [];
      return (
        <ul className="space-y-4">
          {field.questions?.map((q, i) => (
            <li key={q} className="space-y-2">
              <p>{q}</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={q}>
                {options.map((opt) => (
                  <Chip
                    key={opt}
                    radio
                    selected={answers[i] === opt}
                    onClick={() => {
                      const next = field.questions!.map((_, j) => answers[j] ?? null);
                      next[i] = answers[i] === opt ? null : opt;
                      onChange(next);
                    }}
                  >
                    {opt}
                  </Chip>
                ))}
              </div>
            </li>
          ))}
        </ul>
      );
    }

    case "checkbox_pick":
      return <CheckboxPick field={field} value={value} onChange={onChange} />;

    case "table":
      return <Table field={field} value={value} onChange={onChange} currency={currency} extras={extras} />;

    case "calculation":
      return <Calculation field={field} value={value} onChange={onChange} currency={currency} extras={extras} />;
  }
}

function Chip({
  selected,
  onClick,
  children,
  disabled,
  radio = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  /** Inside a radiogroup: announce as a radio button. */
  radio?: boolean;
}) {
  return (
    <button
      type="button"
      role={radio ? "radio" : undefined}
      aria-checked={radio ? selected : undefined}
      aria-pressed={radio ? undefined : selected}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-left transition ${
        selected
          ? "border-indigo bg-indigo text-white"
          : "border-sand-deep bg-white hover:border-indigo disabled:opacity-40"
      }`}
    >
      {children}
    </button>
  );
}

function CheckboxPick({ field, value, onChange }: Omit<FieldProps, "currency">) {
  const picked = Array.isArray(value) ? (value as string[]) : [];
  const max = field.pick ?? Infinity;
  const custom = picked.filter((p) => !field.options?.includes(p));
  const [draft, setDraft] = useState("");
  const full = picked.length >= max;

  const toggle = (opt: string) =>
    onChange(picked.includes(opt) ? picked.filter((p) => p !== opt) : [...picked, opt]);

  const addCustom = () => {
    const word = draft.trim();
    if (word && !picked.includes(word) && !full) onChange([...picked, word]);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      {field.pick && (
        <p className="text-sm text-muted">
          Chosen: {picked.length} of {max}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {[...(field.options ?? []), ...custom].map((opt) => (
          <Chip
            key={opt}
            selected={picked.includes(opt)}
            disabled={full && !picked.includes(opt)}
            onClick={() => toggle(opt)}
          >
            {opt}
          </Chip>
        ))}
      </div>
      {field.allow_custom && (
        <div className="flex max-w-sm gap-2">
          <input
            aria-label="Add your own word"
            placeholder="Add your own word"
            className="field-input"
            value={draft}
            disabled={full}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-ghost py-1.5"
            disabled={full || !draft.trim()}
            onClick={addCustom}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

function Table({ field, value, onChange, currency, extras }: FieldProps) {
  const base = tableRows(field);
  const extra = Math.max(0, (extras?.rowCount ?? 0) - base.length);
  const rows = [...base, ...Array.from({ length: extra }, (_, i) => ({ key: `r${base.length + i}`, label: undefined }))];
  const cols = field.columns ?? [];
  const data = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as TableValue;
  const hasLabels = Boolean(field.row_labels || extras?.rowLabels);
  const rowLabel = (key: string, label?: string) => extras?.rowLabels?.[key] ?? label;
  const colLabel = (c: TableColumn) => extras?.columnLabels?.[c.id] ?? c.label;

  const cellValue = (rowKey: string, label: string | undefined, colId: string) =>
    data[rowKey]?.[colId] ??
    (label && field.prefill?.[label] !== undefined && cols[0]?.id === colId ? field.prefill[label] : "");

  const setCell = (rowKey: string, colId: string, v: string) =>
    onChange({ ...data, [rowKey]: { ...data[rowKey], [colId]: v } });

  const narrow = (c: TableColumn) => c.kind !== "text" && c.kind !== "long_text";

  /** Score columns (2 / 1 / 0): the sum, and how many boxes are still empty (the research list). */
  const scoreTotal = (colId: string) => {
    const values = rows.map(({ key }) => data[key]?.[colId]).filter((v) => v !== undefined && v !== "");
    const sum = values.reduce((s, v) => s + Number(v), 0);
    const empty = rows.length - values.length;
    return values.length ? `${sum}${empty ? ` · ${empty} empty` : ""}` : "—";
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-sand-deep bg-white">
        <table
          className="rtable w-full border-collapse text-left"
          style={{
            // Scroll sideways only when the columns really do not fit.
            minWidth: `${(hasLabels ? 9 : 0) + cols.reduce((w, c) => w + (narrow(c) ? 7 : 11), 0)}rem`,
          }}
        >
          <thead className="bg-sand/60 text-sm">
            <tr>
              {hasLabels && <th className="p-2 pl-3 font-medium">{field.row_header}</th>}
              {cols.map((c) => (
                <th key={c.id} className="p-2 align-bottom font-medium">
                  {colLabel(c)}
                  {c.kind === "money" && <span className="font-normal text-muted"> ({currency})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label }) => (
              <tr key={key} className="border-t border-sand-deep">
                {hasLabels && (
                  <th scope="row" className="p-2 pl-3 align-middle font-normal">
                    {rowLabel(key, label)}
                  </th>
                )}
                {cols.map((c) => {
                  const v = cellValue(key, label, c.id);
                  const aria = `${rowLabel(key, label) ?? `Row ${Number(key.slice(1)) + 1}`} — ${colLabel(c)}`;
                  return (
                    <td
                      key={c.id}
                      className="p-1.5 align-top"
                      data-label={`${colLabel(c)}${c.kind === "money" ? ` (${currency})` : ""}`}
                    >
                      {c.kind === "choice" || c.kind === "score" ? (
                        <select
                          aria-label={aria}
                          className="field-input"
                          value={v}
                          onChange={(e) => setCell(key, c.id, e.target.value)}
                        >
                          <option value="" />
                          {c.options?.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : c.kind === "long_text" ? (
                        <textarea
                          aria-label={aria}
                          rows={2}
                          className="field-input resize-y"
                          value={v}
                          onChange={(e) => setCell(key, c.id, e.target.value)}
                        />
                      ) : (
                        <input
                          aria-label={aria}
                          className={`field-input ${c.kind === "money" || c.kind === "number" ? "text-right" : ""}`}
                          value={v}
                          onChange={(e) => setCell(key, c.id, e.target.value)}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {field.totals && (
            <tfoot>
              <tr className="border-t-2 border-indigo/30 font-semibold">
                {hasLabels && <th className="p-2 pl-3">{field.totals_label ?? "Total"}</th>}
                {cols.map((c, i) => (
                  <td
                    key={c.id}
                    className="p-2 pr-4 text-right"
                    data-label={c.kind === "money" || c.kind === "score" ? colLabel(c) : undefined}
                  >
                    {c.kind === "money" ? (
                      formatTotal(tableFieldTotal(field, data, c.id), currency)
                    ) : c.kind === "score" ? (
                      scoreTotal(c.id)
                    ) : !hasLabels && i === 0 ? (
                      <span className="block text-left">{field.totals_label ?? "Total"}</span>
                    ) : null}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {field.totals && cols.some((c) => c.kind === "money" && !tableFieldTotal(field, data, c.id).complete) && (
        <p className="text-sm text-amber">
          Not complete yet: some amounts are unknown or not marked. That is fine — now you know what to check.
        </p>
      )}
    </div>
  );
}

function formatCalc(row: CalcRow, r: CalcResult, currency: string) {
  if (r.value === null) return "—";
  let text: string;
  if (row.format === "months") text = `${Math.floor(r.value * 10) / 10} months`;
  else if (row.format === "left_or_short")
    text = r.value < 0 ? `${formatMoney(-r.value, currency)} short` : `${formatMoney(r.value, currency)} left over`;
  else text = formatMoney(r.value, currency);
  return r.complete ? text : `${text} — not complete yet`;
}

function Calculation({ field, value, onChange, currency, extras }: FieldProps) {
  const rows = (Array.isArray(field.rows) ? field.rows : []) as CalcRow[];
  const inputs = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, string>;
  return (
    <div className="overflow-x-auto rounded-xl border border-sand-deep bg-white">
      <table className="rtable w-full min-w-[30rem] border-collapse text-left">
        <thead className="bg-sand/60 text-sm">
          <tr>
            <th className="p-2 pl-3 font-medium" />
            <th className="w-32 p-2 font-medium text-muted">Example</th>
            <th className="w-44 p-2 font-medium">Me</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const r = extras?.calc?.[row.id];
            if (r && !r.visible) return null;
            return (
              <tr key={row.id} className="border-t border-sand-deep">
                <th scope="row" className="p-2 pl-3 align-middle font-normal">
                  {row.label}
                </th>
                <td className="p-2 text-muted" data-label="Example">
                  {row.example}
                </td>
                <td className="p-1.5" data-label="Me">
                  {row.input ? (
                    <input
                      aria-label={row.label}
                      className="field-input text-right"
                      value={inputs[row.id] ?? ""}
                      onChange={(e) => onChange({ ...inputs, [row.id]: e.target.value })}
                    />
                  ) : (
                    <output className={`block px-2 text-right font-semibold ${r && !r.complete ? "text-amber" : ""}`}>
                      {r ? formatCalc(row, r, currency) : "—"}
                    </output>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
