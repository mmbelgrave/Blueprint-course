// The Life You Choose mark ("Terraces") and the journey motif.
// Rules from the brand guide: exactly three lines, each stepping up, with one
// ochre dot above the top line. Lines 1–2 Pine, line 3 Moss, dot Ochre. The
// full mark is never smaller than 32px wide, and a page carries at most one
// full motif. To show a phase, that line stays at full colour and the other two
// are set in Sage; the dot is at full colour only in "Live it" content.
import { PRODUCT } from "@/lib/content";

// The colours come from the theme, not from fixed hex: on the dark ground the
// same tokens point at Sand, Ochre-light and Moss-light, so the mark stays the
// mark instead of turning into Pine lines on black.
const PINE = "var(--color-pine)";
const MOSS = "var(--color-moss)";
const OCHRE = "var(--color-ochre)";
const SAGE = "var(--color-sage)";

/** The mark on its own: three stacked terraces and the dot. */
export function Mark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.74)}
      viewBox="-10 0 100 74"
      className={className}
      role="img"
      aria-label={`${PRODUCT.brand} mark`}
    >
      <path d="M6 58 H74" stroke={PINE} strokeWidth="5" strokeLinecap="round" />
      <path d="M17 45 H63" stroke={PINE} strokeWidth="5" strokeLinecap="round" />
      <path d="M28 32 H52" stroke={MOSS} strokeWidth="5" strokeLinecap="round" />
      <circle cx="40" cy="18" r="5.5" fill={OCHRE} />
    </svg>
  );
}

/** The mark above the name, for the header. */
export function Lockup() {
  return (
    <span className="flex flex-col items-center gap-1">
      <Mark size={46} />
      <span className="display text-[1.05rem] leading-none text-pine">{PRODUCT.name}</span>
    </span>
  );
}

const PHASES = ["Choose it", "Build it", "Live it"] as const;
export type Phase = (typeof PHASES)[number];

/**
 * The journey motif, laid out along the page: the phase the person is in stays
 * at full colour, the other two are Sage. Steps 1 and 2 are both "Choose it".
 */
export function JourneyMotif({ phase = "Choose it", note }: { phase?: Phase; note?: string }) {
  const on = (p: Phase, colour: string) => (p === phase ? colour : SAGE);
  return (
    <div className="flex items-center gap-4">
      <svg width="104" height="62" viewBox="0 0 120 74" aria-hidden className="shrink-0">
        <path d="M8 60 H52" stroke={on("Choose it", PINE)} strokeWidth="5" strokeLinecap="round" />
        <path d="M34 44 H78" stroke={on("Build it", PINE)} strokeWidth="5" strokeLinecap="round" />
        <path d="M60 28 H104" stroke={on("Live it", MOSS)} strokeWidth="5" strokeLinecap="round" />
        <circle cx="112" cy="14" r="5.5" fill={phase === "Live it" ? OCHRE : SAGE} />
      </svg>
      <p className="text-sm">
        <span className="display text-base text-pine">
          {PHASES.map((p, i) => (
            <span key={p}>
              {i > 0 && <span className="text-stone"> · </span>}
              <span className={p === phase ? "border-b-2 border-ochre pb-px" : "text-stone"}>{p}</span>
            </span>
          ))}
        </span>
        {note && <span className="mt-0.5 block text-stone">{note}</span>}
      </p>
    </div>
  );
}
