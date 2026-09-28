"use client";
// The printable result of a step (brief 4.6): Step 1 "My Working Direction",
// Step 2 "My Explore Summary". One document layout serves every step.
// "Save as PDF" uses the browser's print window.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { pictureLinks, picturesAvailable } from "@/lib/backend/pictures";
import { RequireUser, Shell } from "@/components/Shell";
import { fieldAnswerText } from "@/lib/answer-text";
import { useApp } from "@/lib/app-state";
import {
  exerciseFields,
  getStep,
  tableRows,
  PRODUCT,
  type Exercise,
  type Field,
  type StepContent,
  type TableColumn,
} from "@/lib/content";
import { stepHref } from "@/lib/progress";

type TableValue = Record<string, Record<string, string>>;

function fieldLabel(field: Field) {
  return field.label ?? field.hint ?? "";
}

function tableHasData(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as TableValue).some((row) => Object.values(row ?? {}).some((v) => String(v ?? "").trim()));
}

/** A table answer as it is meant to be read on paper: the columns as columns. */
function AnswerTable({ field, value, currency }: { field: Field; value: unknown; currency: string }) {
  const cols = field.columns ?? [];
  const data = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as TableValue;
  const base = tableRows(field);
  // Rows the person added beyond the printed ones keep their own keys.
  const extraKeys = Object.keys(data).filter((k) => !base.some((r) => r.key === k));
  const rows = [...base, ...extraKeys.map((key) => ({ key, label: undefined as string | undefined }))];
  const hasRowNames = Boolean(field.row_labels);

  const cellText = (rowKey: string, label: string | undefined, col: TableColumn) => {
    const typed = data[rowKey]?.[col.id]?.trim();
    if (typed) return typed;
    // The workbook's starting text in the first column (4.1 "Change nothing").
    if (label && cols[0]?.id === col.id) return field.prefill?.[label]?.trim() ?? "";
    return "";
  };

  const filled = rows.filter(({ key, label }) => cols.some((c) => cellText(key, label, c)));
  if (!filled.length) return null;

  const head = "border-b border-pine/20 bg-pine px-3 py-2 text-left text-[9pt] font-semibold uppercase tracking-wide text-sand";

  return (
    <div className="break-inside-avoid overflow-hidden rounded-lg border border-line">
      <table className="w-full border-collapse text-[10.5pt]">
        <thead>
          <tr>
            {hasRowNames && <th className={head}>{field.row_header ?? ""}</th>}
            {cols.map((c) => (
              <th key={c.id} className={head}>
                {c.label}
                {c.kind === "money" && <span className="font-normal normal-case"> ({currency})</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filled.map(({ key, label }, i) => (
            <tr key={key} className={i ? "border-t border-line" : ""}>
              {hasRowNames && (
                <th scope="row" className="bg-sage/60 px-3 py-2 text-left align-top font-semibold">
                  {label}
                </th>
              )}
              {cols.map((c) => (
                <td key={c.id} className="px-3 py-2 align-top">
                  {cellText(key, label, c) || <span className="text-stone">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One answer: a table keeps its shape, everything else is label and text. */
function AnswerBlock({ exercise, field, currency }: { exercise: Exercise; field: Field; currency: string }) {
  const { answers } = useApp();
  const values = answers[exercise.id];
  const label = fieldLabel(field);

  if (field.type === "table") {
    if (!tableHasData(values?.[field.id])) return null;
    return (
      <div className="break-inside-avoid space-y-2">
        {label && <p className="text-[9.5pt] font-semibold text-pine">{label}</p>}
        <AnswerTable field={field} value={values?.[field.id]} currency={currency} />
      </div>
    );
  }

  const text = fieldAnswerText(exercise.id, field.id, values);
  if (!text) return null;
  return (
    <div className="break-inside-avoid">
      <p className="text-[9.5pt] font-semibold text-pine">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-[11pt] leading-relaxed">{text}</p>
    </div>
  );
}

function hasAnswers(exercise: Exercise, answers: Record<string, Record<string, unknown>>) {
  const values = answers[exercise.id];
  return exerciseFields(exercise).some((f) =>
    f.type === "table" ? tableHasData(values?.[f.id]) : Boolean(fieldAnswerText(exercise.id, f.id, values)),
  );
}

/** The pictures from 1.2, printed three to a row under the Working Direction. */
function BoardSection() {
  const { answers } = useApp();
  const pictures = Array.isArray(answers["1.2"]?.board) ? (answers["1.2"].board as { path: string; caption: string }[]) : [];
  const [links, setLinks] = useState<Record<string, string>>({});
  const paths = pictures.map((p) => p.path).join("|");

  useEffect(() => {
    if (!picturesAvailable || !paths) return;
    let cancelled = false;
    pictureLinks(paths.split("|"))
      .then((l) => !cancelled && setLinks(l))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [paths]);

  if (!pictures.length) return null;
  return (
    <section className="break-inside-avoid space-y-3">
      <h2 className="text-[16pt] text-pine">My board</h2>
      <div className="grid grid-cols-3 gap-3">
        {pictures.map((p) => (
          <figure key={p.path} className="break-inside-avoid">
            {links[p.path] && (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed links
              <img src={links[p.path]} alt={p.caption || "A picture from my board"} className="aspect-[4/3] w-full rounded-lg object-cover" />
            )}
            {p.caption && <figcaption className="mt-1 text-[9.5pt] text-stone">{p.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}

function PrintPage({ step }: { step: StepContent }) {
  const { profile, answers } = useApp();
  // The step's result is its last part: the main page first, then the others.
  const result = step.parts.at(-1)!;
  const [main, ...others] = result.exercises;
  const currency = profile?.currency ?? "EUR";
  const mainFields = exerciseFields(main);
  const [lead, ...restOfMain] = mainFields;
  const leadText = lead && lead.type !== "table" ? fieldAnswerText(main.id, lead.id, answers[main.id]) : null;
  const mainFilled = hasAnswers(main, answers);
  const today = new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <button className="btn btn-primary" onClick={() => window.print()}>
          Save as PDF
        </button>
        <span className="text-sm text-stone">In the window that opens, choose &ldquo;Save as PDF&rdquo;.</span>
        <Link href={stepHref(step.step.number)} className="ml-auto text-sm text-pine underline">
          Back to Step {step.step.number}
        </Link>
      </div>

      <article className="mx-auto max-w-[210mm] overflow-hidden rounded-2xl bg-white shadow-sm print:max-w-none print:rounded-none print:shadow-none">
        {/* The result banner: Sand on Pine, the brand's way of marking a result. */}
        <header className="bg-pine px-8 py-7 text-sand">
          <p className="text-[9pt] font-semibold uppercase tracking-[0.14em] text-ochre-light">
            {PRODUCT.name} · {PRODUCT.edition}
          </p>
          <h1 className="display mt-2 text-[30pt] leading-tight text-sand">{result.finish.title}</h1>
          <p className="mt-2 text-[10.5pt] text-sand/85">
            Step {step.step.number} · {step.step.title}
            {profile?.first_name ? ` · ${profile.first_name}` : ""} · {today}
          </p>
        </header>

        <div className="space-y-7 px-8 py-8">
          {result.finish.description && <p className="text-[11pt] text-stone">{result.finish.description}</p>}

          {mainFilled ? (
            <>
              {leadText && (
                <section className="break-inside-avoid border-l-4 border-ochre bg-sage/50 px-5 py-4">
                  <p className="text-[9.5pt] font-semibold text-pine">{fieldLabel(lead)}</p>
                  <p className="display mt-1 whitespace-pre-line text-[14pt] leading-snug text-granite">{leadText}</p>
                </section>
              )}
              <section className="space-y-5">
                {(leadText ? restOfMain : mainFields).map((f) => (
                  <AnswerBlock key={f.id} exercise={main} field={f} currency={currency} />
                ))}
              </section>
            </>
          ) : (
            <p className="rounded-lg bg-sand p-4 print:hidden">
              Nothing written yet. Fill in {main.number ?? main.id} {main.title} first — then your page appears here.
            </p>
          )}

          {others.filter((e) => hasAnswers(e, answers)).map((e) => (
            <section key={e.id} className="break-inside-avoid space-y-4">
              <h2 className="border-b border-line pb-1 text-[17pt] text-pine">{e.title}</h2>
              {exerciseFields(e).map((f) => (
                <AnswerBlock key={f.id} exercise={e} field={f} currency={currency} />
              ))}
            </section>
          ))}

          {step.step.number === 1 && <BoardSection />}

          <footer className="break-inside-avoid space-y-4 border-t-2 border-pine pt-5">
            <div className="space-y-1">
              <p className="text-[10.5pt] text-stone">{step.closing.intro}</p>
              {step.closing.final.map((l) => (
                <p key={l} className="display text-[13pt] text-pine">
                  {l}
                </p>
              ))}
            </div>
            <p className="text-[8.5pt] leading-relaxed text-stone">
              © {new Date().getFullYear()} {PRODUCT.copyright_holder} · {PRODUCT.name} — {PRODUCT.edition}. Your
              answers are your own. This page is for your personal use; the workbook text and layout may not be
              copied or shared.
            </p>
          </footer>
        </div>
      </article>
    </>
  );
}

export default function Print() {
  const { step } = useParams<{ step: string }>();
  const content = getStep(Number(step));
  return (
    <Shell>
      <RequireUser>
        {content ? <PrintPage step={content} /> : <p>This step does not exist.</p>}
      </RequireUser>
    </Shell>
  );
}
