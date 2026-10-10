"use client";
/*
 * The pictures in a result document (spec §6.5).
 *
 * Every one of these draws a person's own numbers and nothing else. None of
 * them invents a scale, a trend or a projection: a bar is as long as the
 * number, and where a number is missing the row says so rather than drawing a
 * zero. A chart in this document will be read by somebody deciding whether to
 * move country, so it may never flatter the figures.
 *
 * Plain elements rather than a charting library: these have to print, and a
 * print engine is not a browser with a canvas.
 */

/* ───────────────────────────── where you are ──────────────────────────── */

export type DotState = "done" | "here" | "open";

/** The three steps of the phase, as a line of dots. */
export function PhaseDots({ steps }: { steps: { label: string; note?: string; state: DotState }[] }) {
  return (
    <div className="relative">
      <div className="absolute left-[7px] right-[7px] top-[7px] border-t border-line" />
      <ol className="relative flex justify-between">
        {steps.map((s, i) => (
          <li key={s.label} className={`flex flex-col ${i === steps.length - 1 ? "items-end text-right" : ""}`}>
            <span
              className={`h-[15px] w-[15px] rounded-full ${
                s.state === "open" ? "border-[1.75px] border-line bg-white" : s.state === "here" ? "bg-ochre" : "bg-pine"
              }`}
            />
            <span className="mt-3 text-[9.5pt] text-pine">
              <span className="tabular text-stone">{String(i + 1).padStart(2, "0")}</span> {s.label}
            </span>
            {s.note && <span className="text-[8.5pt] text-stone">{s.note}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ──────────────────────────── today → one year ────────────────────────── */

export type DumbbellRow = { label: string; from: number | null; to: number | null };

/**
 * Where each part of life stands today and where the person wants it in a
 * year. Two marks on one line: the distance between them is the whole point,
 * so a row with only one of the two numbers draws only that mark.
 */
export function Dumbbell({ rows, min = 1, max = 10 }: { rows: DumbbellRow[]; min?: number; max?: number }) {
  const at = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center gap-7 text-[9.5pt]">
        <span className="flex items-center gap-2">
          <span className="h-[11px] w-[11px] rounded-full bg-pine" /> Today
        </span>
        <span className="flex items-center gap-2">
          <span className="h-[11px] w-[11px] rounded-full border-[1.75px] border-ochre bg-white" /> In one year
        </span>
      </div>

      <div className="mt-5 grid grid-cols-[52mm_1fr] items-center gap-x-5">
        <span />
        <div className="relative h-5 text-[8.5pt] tabular text-stone">
          {[min, Math.round((min + max) / 2), max].map((v) => (
            <span key={v} className="absolute -translate-x-1/2" style={{ left: `${at(v)}%` }}>
              {v}
            </span>
          ))}
        </div>
        {rows.map((r) => (
          <Line key={r.label} label={r.label} a={r.from === null ? null : at(r.from)} b={r.to === null ? null : at(r.to)} />
        ))}
      </div>
    </div>
  );
}

function Line({ label, a, b }: { label: string; a: number | null; b: number | null }) {
  const lo = a !== null && b !== null ? Math.min(a, b) : null;
  const hi = a !== null && b !== null ? Math.max(a, b) : null;
  return (
    <>
      <span className="py-[7px] text-[10.5pt] leading-snug">{label}</span>
      <span className="relative block h-9">
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
        {lo !== null && hi !== null && hi - lo > 0.5 && (
          <span
            className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-ochre"
            style={{ left: `${lo}%`, width: `${hi - lo}%` }}
          />
        )}
        {b !== null && (
          <span
            className="absolute top-1/2 h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2px] border-ochre bg-white"
            style={{ left: `${b}%` }}
          />
        )}
        {a !== null && (
          <span
            className="absolute top-1/2 h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pine"
            style={{ left: `${a}%` }}
          />
        )}
      </span>
    </>
  );
}

/* ──────────────────────────────── bars ────────────────────────────────── */

/** Two shares of the same whole: the hours now, and the hours wanted. */
export function ShareBars({ rows }: { rows: { label: string; percent: number; tone: "pine" | "ochre" }[] }) {
  return (
    <div className="space-y-4">
      {rows.map((r) => {
        const width = Math.max(0, Math.min(100, r.percent));
        return (
          <div key={r.label} className="grid grid-cols-[42mm_1fr] items-center gap-x-4">
            <span className="text-[10.5pt]">{r.label}</span>
            <span className="relative block h-7 bg-sage">
              <span
                className={`absolute inset-y-0 left-0 ${r.tone === "pine" ? "bg-pine" : "bg-ochre"}`}
                style={{ width: `${width}%` }}
              />
              <span
                className={`absolute top-1/2 -translate-y-1/2 pl-2 text-[10.5pt] font-semibold ${
                  r.tone === "pine" ? "text-pine" : "text-ochre"
                }`}
                style={{ left: `${width}%` }}
              >
                {Math.round(r.percent)}%
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Two amounts on the same scale, each with its figure above it. Used wherever
 * the document puts two money lines side by side — a guess against what was
 * found, costs against income.
 */
export function AmountBars({
  rows,
  currency,
}: {
  rows: { label: string; amount: number | null; tone: "pine" | "ochre" | "moss" | "muted" }[];
  currency: string;
}) {
  const top = Math.max(1, ...rows.map((r) => r.amount ?? 0));
  const fill = { pine: "bg-pine", ochre: "bg-ochre", moss: "bg-moss", muted: "bg-stone/50" };
  return (
    <div className="space-y-6">
      {rows.map((r) => (
        <div key={r.label}>
          <p className="flex items-baseline justify-between">
            <span className="text-[10.5pt]">{r.label}</span>
            <span className="text-[11pt] font-semibold tabular text-pine">
              {r.amount === null ? "—" : money(r.amount, currency)}
            </span>
          </p>
          <span className="mt-2 block h-[14px] w-full bg-sage">
            <span className={`block h-full ${fill[r.tone]}`} style={{ width: `${((r.amount ?? 0) / top) * 100}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Scores out of a fixed total, one row each, the chosen one picked out. */
export function ScoreBars({
  rows,
  outOf,
}: {
  rows: { label: string; score: number; chosen?: boolean }[];
  outOf: number;
}) {
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[42mm_1fr_14mm] items-center gap-x-4">
          <span className={`text-[10.5pt] ${r.chosen ? "font-semibold text-pine" : ""}`}>{r.label}</span>
          <span className="relative block h-[14px] bg-sage">
            <span
              className={`block h-full ${r.chosen ? "bg-pine" : "bg-stone/45"}`}
              style={{ width: `${Math.max(0, Math.min(100, (r.score / outOf) * 100))}%` }}
            />
          </span>
          <span className={`text-right text-[11pt] tabular ${r.chosen ? "font-semibold text-pine" : "text-stone"}`}>
            {r.score}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────── the waterfall ─────────────────────────── */

export type WaterfallStep = { label: string; amount: number; kind: "start" | "take" | "keep" | "end" };

/**
 * How savings become money you can actually live on: the opening figure, each
 * amount taken out of it, and what is left. Drawn as a cascade because the
 * order is the argument — a reserve and a return fund are not spending, they
 * are money deliberately put out of reach.
 */
export function Waterfall({ steps, currency }: { steps: WaterfallStep[]; currency: string }) {
  const start = steps.find((s) => s.kind === "start")?.amount ?? 0;
  if (!start) return null;
  const H = 150;
  const scale = (v: number) => (Math.abs(v) / start) * H;

  /*
   * Each bar hangs from what was left before it. The running figure is
   * carried through the fold rather than kept in a variable, so this stays a
   * plain calculation with nothing to reassign.
   */
  const bars = steps.reduce<{ left: number; out: (WaterfallStep & { top: number; height: number })[] }>(
    (acc, s) => {
      if (s.kind === "start") {
        return { left: s.amount, out: [...acc.out, { ...s, top: 0, height: scale(s.amount) }] };
      }
      if (s.kind === "end") {
        return { left: acc.left, out: [...acc.out, { ...s, top: H - scale(s.amount), height: scale(s.amount) }] };
      }
      const before = acc.left;
      return {
        left: before - Math.abs(s.amount),
        out: [...acc.out, { ...s, top: H - scale(before), height: scale(Math.abs(s.amount)) }],
      };
    },
    { left: 0, out: [] },
  ).out;

  const colour = { start: "bg-pine", take: "bg-ochre", keep: "bg-stone/50", end: "bg-moss" };

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: `${H + 26}px` }}>
        {bars.map((b, i) => (
          <div key={b.label} className="relative flex-1" style={{ height: `${H + 26}px` }}>
            {/* The dotted line carrying the running total to the next bar. */}
            {i < bars.length - 1 && (
              <span
                className="absolute left-1/2 w-[calc(100%+0.5rem)] border-t border-dotted border-stone/50"
                style={{ top: `${b.top + 26}px` }}
              />
            )}
            <span
              className="absolute w-full text-center text-[9pt] tabular text-pine"
              style={{ top: `${Math.max(0, b.top + 26 - 20)}px` }}
            >
              {b.kind === "take" || b.kind === "keep" ? "−" : ""}
              {short(Math.abs(b.amount), currency)}
            </span>
            <span
              className={`absolute w-full ${colour[b.kind]}`}
              style={{ top: `${b.top + 26}px`, height: `${Math.max(3, b.height)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 border-t border-line pt-2">
        {bars.map((b) => (
          <span key={b.label} className="flex-1 text-center text-[8.5pt] leading-tight text-stone">
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────── the lights ───────────────────────────── */

export type LightColour = "green" | "amber" | "red" | "unknown";

/** The five green lights, as five little traffic lights. */
export function Lights({ lights }: { lights: { name: string; colour: LightColour; note?: string }[] }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {lights.map((l) => (
        <div key={l.name} className="flex flex-col border border-line bg-white p-3">
          <div className="flex gap-2">
            <span className="flex flex-col gap-1 pt-[3px]">
              {(["red", "amber", "green"] as const).map((c) => (
                <span
                  key={c}
                  className={`h-[7px] w-[7px] rounded-full ${
                    l.colour === c ? (c === "green" ? "bg-moss" : c === "amber" ? "bg-ochre" : "bg-error") : "bg-sage"
                  }`}
                />
              ))}
            </span>
            <span>
              <span className="block text-[10.5pt] font-semibold text-pine">{l.name}</span>
              <span
                className={`block text-[9.5pt] ${
                  l.colour === "green"
                    ? "text-moss"
                    : l.colour === "amber"
                      ? "text-ochre"
                      : l.colour === "red"
                        ? "text-error"
                        : "text-stone"
                }`}
              >
                {l.colour === "unknown" ? "not set" : l.colour[0].toUpperCase() + l.colour.slice(1)}
              </span>
            </span>
          </div>
          {l.note && <span className="mt-3 text-[9pt] leading-snug text-stone">{l.note}</span>}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── the life around it ───────────────────────── */

/** Times from the same front door, drawn around the house. */
export function Hub({ centre, spokes }: { centre: string; spokes: { label: string; value: string; sure: boolean }[] }) {
  const four = spokes.slice(0, 4);
  const corner = ["items-start text-left", "items-end text-right", "items-start text-left", "items-end text-right"];
  return (
    <div className="relative">
      {/* The four thin lines back to the house. Decoration, not measurement. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="none">
        <line x1="14%" y1="26%" x2="42%" y2="46%" stroke="var(--color-line)" strokeWidth="1" />
        <line x1="86%" y1="26%" x2="58%" y2="46%" stroke="var(--color-line)" strokeWidth="1" />
        <line x1="14%" y1="80%" x2="42%" y2="58%" stroke="var(--color-line)" strokeWidth="1" />
        <line x1="86%" y1="80%" x2="58%" y2="58%" stroke="var(--color-line)" strokeWidth="1" />
      </svg>
      <div className="grid grid-cols-2 gap-y-16">
        {four.map((s, i) => (
          <div key={s.label} className={`flex flex-col ${corner[i]}`}>
            <span className="display text-[26pt] leading-none text-pine">{s.value}</span>
            <span className="mt-2 flex items-center gap-2 text-[10.5pt]">
              <span className={`h-[9px] w-[9px] rounded-full ${s.sure ? "bg-moss" : "bg-ochre"}`} />
              {s.label}
            </span>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="display max-w-[46mm] bg-pine px-5 py-4 text-center text-[13pt] leading-tight text-sand">
          {centre}
        </span>
      </div>
    </div>
  );
}

/* ───────────────────────────────── lists ──────────────────────────────── */

/** A row with a dot, a name, a line under it and a date on the right. */
export function ConditionRows({ rows }: { rows: { name: string; note?: string; when?: string }[] }) {
  return (
    <ul>
      {rows.map((r) => (
        <li key={r.name} className="border-b border-line py-3 last:border-0">
          <div className="flex items-baseline justify-between gap-6">
            <span className="flex items-baseline gap-3">
              <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-ochre" />
              <span className="text-[11pt] font-semibold text-pine">{r.name}</span>
            </span>
            {r.when && <span className="shrink-0 text-[9.5pt] text-ochre">{r.when}</span>}
          </div>
          {r.note && <p className="mt-1 pl-6 text-[10.5pt] text-stone">{r.note}</p>}
        </li>
      ))}
    </ul>
  );
}

/** What each need asks for, what the research found, and where that leaves it. */
export function NeedRows({ rows }: { rows: { need: string; found: string; state: string; sure: boolean }[] }) {
  return (
    <ul>
      {rows.map((r) => (
        <li key={r.need} className="border-b border-line py-3 last:border-0">
          <div className="grid grid-cols-[62mm_1fr_26mm] items-baseline gap-x-5">
            <span className="flex items-baseline gap-3">
              <span className={`h-[9px] w-[9px] shrink-0 rounded-full ${r.sure ? "bg-moss" : "bg-ochre"}`} />
              <span className="text-[10.5pt] font-semibold text-pine">{r.need}</span>
            </span>
            <span className="text-[10.5pt]">{r.found}</span>
            <span className={`text-right text-[9.5pt] ${r.sure ? "text-moss" : "text-ochre"}`}>{r.state}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Numbered risks: what could go wrong, the sign, and the answer to it. */
export function Numbered({ items }: { items: { title: string; sign?: string; answer?: string }[] }) {
  return (
    <ol>
      {items.map((r, i) => (
        <li key={r.title} className="border-b border-line py-4 last:border-0">
          <div className="grid grid-cols-[18mm_1fr] gap-x-2">
            <span className="display text-[20pt] leading-none text-ochre">{String(i + 1).padStart(2, "0")}</span>
            <span>
              <span className="block text-[11.5pt] font-semibold text-pine">{r.title}</span>
              {r.sign && <span className="mt-2 block text-[10.5pt]">{r.sign}</span>}
              {r.answer && <span className="mt-2 block text-[10.5pt] text-stone">{r.answer}</span>}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** The order things happen in, as a line down the page. */
export function Steps({ steps }: { steps: { when?: string; what: string; note?: string }[] }) {
  return (
    <ol className="relative">
      <span className="absolute bottom-10 left-[11px] top-6 w-px bg-line" />
      {steps.map((s, i) => (
        <li key={s.what} className="relative grid grid-cols-[14mm_1fr] pb-6 last:pb-0">
          <span className="relative z-10 flex h-[23px] w-[23px] items-center justify-center rounded-full bg-pine text-[9.5pt] font-semibold text-sand">
            {i + 1}
          </span>
          <span className="pt-[2px]">
            {s.when && (
              <span className="block text-[8.5pt] font-semibold uppercase tracking-[0.1em] text-ochre">{s.when}</span>
            )}
            <span className="display mt-1 block text-[15pt] leading-snug text-pine">{s.what}</span>
            {s.note && <span className="mt-1 block text-[10.5pt] text-stone">{s.note}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Two or three figures the reader should carry away. */
export function BigNumbers({ items }: { items: { value: string; caption: string; tone?: "pine" | "ochre" | "moss" }[] }) {
  const tone = { pine: "text-pine", ochre: "text-ochre", moss: "text-moss" };
  return (
    <div className={`grid gap-8 ${items.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
      {items.map((i) => (
        <div key={i.caption}>
          <p className={`display text-[30pt] leading-none ${tone[i.tone ?? "pine"]}`}>{i.value}</p>
          <p className="mt-3 text-[10.5pt] font-semibold">{i.caption}</p>
        </div>
      ))}
    </div>
  );
}

/** One figure, set big, with a sentence beside it. */
export function Statement({
  value,
  tone = "ochre",
  children,
}: {
  value: string;
  tone?: "pine" | "ochre" | "moss";
  children: React.ReactNode;
}) {
  const colour = { pine: "text-pine", ochre: "text-ochre", moss: "text-moss" };
  return (
    <div className="flex items-center gap-8 bg-sage px-8 py-6">
      <p className={`display shrink-0 text-[32pt] leading-none ${colour[tone]}`}>{value}</p>
      <div className="text-[10.5pt] leading-relaxed">{children}</div>
    </div>
  );
}

/** Someone's own words, set as a pull quote. */
export function Quote({ text, who }: { text: string; who?: string }) {
  return (
    <figure>
      <blockquote className="display text-[16pt] leading-snug text-pine">&ldquo;{text}&rdquo;</blockquote>
      {who && (
        <figcaption className="mt-3 text-[8.5pt] font-semibold uppercase tracking-[0.1em] text-ochre">{who}</figcaption>
      )}
    </figure>
  );
}

/* ─────────────────────────────── numbers ──────────────────────────────── */

function symbol(currency: string) {
  const known: Record<string, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    CHF: "CHF ",
    AUD: "$",
    CAD: "$",
    ZAR: "R",
    BRL: "R$",
  };
  return known[currency] ?? `${currency} `;
}

export const money = (n: number, currency: string) => `${symbol(currency)}${Math.round(n).toLocaleString("en-GB")}`;

/** 56000 as "€56k", for a chart label with 20mm to live in. */
export const short = (n: number, currency: string) => {
  const s = symbol(currency);
  if (Math.abs(n) >= 1000) return `${s}${(Math.round(n / 100) / 10).toLocaleString("en-GB")}k`;
  return `${s}${Math.round(n).toLocaleString("en-GB")}`;
};
