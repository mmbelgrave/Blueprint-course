"use client";
/*
 * The furniture every page of a result document shares (spec §6.5).
 *
 * These documents leave the app: they are shown to a partner, a parent, an
 * adviser, sometimes a landlord. So they are laid out as paper — A4 sheets
 * with a cover, running heads and page numbers — rather than as a web page
 * that happens to print.
 *
 * Nothing here knows anything about a person's answers. It is the paper; what
 * goes on it is decided in lib/report.
 */
import { Mark } from "@/components/brand";
import { PRODUCT } from "@/lib/content";

/** A4 at 96dpi, less the print margins, so the screen shows what prints. */
export const SHEET = "mx-auto w-full max-w-[210mm] min-h-[297mm] print:h-[297mm] print:min-h-0";

/**
 * These documents set their own page: each sheet is a whole side of A4 and
 * carries its own margin, so the Pine cover can run to the edge of the paper
 * the way it does on screen. Without this, the browser's own page margin
 * would box the cover in and the sheet would no longer be one page.
 *
 * Chrome honours this while the print dialog's margins are on "Default".
 */
export const PageSetup = () => (
  <style>{"@media print { @page { size: A4; margin: 0 } }"}</style>
);

/**
 * One sheet. On paper each one starts a new page; on screen they are cards
 * with a little air between them.
 */
export function Sheet({
  children,
  dark = false,
  last = false,
}: {
  children: React.ReactNode;
  /** The cover: Pine to the edge of the paper. */
  dark?: boolean;
  last?: boolean;
}) {
  return (
    <section
      className={`${SHEET} mb-6 flex flex-col overflow-hidden rounded-2xl shadow-sm print:mb-0 print:overflow-visible print:rounded-none print:shadow-none ${
        last ? "" : "print:break-after-page"
      } ${dark ? "bg-pine text-sand" : "bg-white"}`}
    >
      {children}
    </section>
  );
}

/** The lockup as the documents use it: mark and name on one line. */
export function ReportLockup({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <Mark size={34} onDark={onDark} />
      <span className={`display text-[13pt] leading-none ${onDark ? "text-sand" : "text-pine"}`}>
        The Life You <em>Choose</em>
      </span>
    </span>
  );
}

/** Top of every page after the cover: who we are, and where we are. */
export function RunningHead({ where }: { where: string }) {
  return (
    <header className="flex items-center justify-between px-[15mm] pb-8 pt-[14mm]">
      <ReportLockup />
      <span className="text-[9.5pt] text-stone">{where}</span>
    </header>
  );
}

/** The small ochre line that names a section. */
export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[8.5pt] font-semibold uppercase tracking-[0.12em] text-ochre">{children}</p>
  );
}

/** The one big line a page is about. */
export function Headline({ children }: { children: React.ReactNode }) {
  return <h2 className="display mt-3 text-[25pt] leading-[1.12] text-pine">{children}</h2>;
}

/** The paragraph under a headline: what this page says, in one or two lines. */
export function Standfirst({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 max-w-[150mm] text-[11pt] leading-relaxed">{children}</p>;
}

/**
 * The grey line at the foot of a section: where the figures come from, what is
 * still an estimate, what the reader should not read into them. These
 * documents are shown to other people, so what the app does not know has to be
 * on the page, not left to the reader to guess.
 */
export function Footnote({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 text-[8.5pt] leading-snug text-stone">{children}</p>;
}

/**
 * A line of the person's own words, set large. People write a phrase on one
 * page and three sentences on the next, so the size gives way to the words
 * rather than the words being cut to fit the size.
 */
export function Pull({ children, className = "" }: { children: string; className?: string }) {
  const n = children.length;
  const size = n <= 46 ? "text-[19pt]" : n <= 110 ? "text-[15pt]" : "text-[12.5pt]";
  return <p className={`display leading-snug text-pine ${size} ${className}`}>{children}</p>;
}

/** The rule that separates two sections of a page. */
export const Rule = () => <hr className="my-8 border-0 border-t border-line" />;

/** The bottom of every page: whose copy this is, and where you are in it. */
export function PageFoot({ who, page, of }: { who: string; page: number; of: number }) {
  const n = (x: number) => String(x).padStart(2, "0");
  return (
    <footer className="mt-auto flex items-end justify-between border-t border-line px-[15mm] pb-[14mm] pt-4 text-[8.5pt] text-stone">
      <span>
        {who ? `${who} · ` : ""}
        {PRODUCT.name}
      </span>
      <span>
        {n(page)} / {n(of)}
      </span>
    </footer>
  );
}

/** The body of a page, between the running head and the page foot. */
export function Body({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 px-[15mm]">{children}</div>;
}

/**
 * The cover. The quiet rule here is that the big line is the person's own
 * sentence, never one we wrote for them: a document that opens with words
 * they did not write is not their blueprint.
 */
/*
 * The cover line is the person's own sentence, and people write sentences of
 * very different lengths. Rather than cut theirs to fit a size we picked, the
 * size gives way to the sentence.
 */
function coverSize(headline: string, tail?: string) {
  const n = headline.length + (tail?.length ?? 0);
  if (n <= 44) return "text-[36pt]";
  if (n <= 80) return "text-[27pt]";
  if (n <= 130) return "text-[21pt]";
  return "text-[17pt]";
}

export function Cover({
  kicker,
  headline,
  tail,
  quote,
  lines,
  who,
  when,
}: {
  kicker: string;
  /** The first part of their sentence, set upright. */
  headline: string;
  /** The rest of it, set in italic on its own line. Optional. */
  tail?: string;
  quote?: string;
  /** Short facts under the quote, one per line. */
  lines?: string[];
  who: string;
  when: string;
}) {
  return (
    <div className="bg-pine px-[15mm] pb-10 pt-[14mm] text-sand">
      <ReportLockup onDark />
      <p className="mt-12 text-[8.5pt] font-semibold uppercase tracking-[0.12em] text-ochre-light">{kicker}</p>
      <h1 className={`display mt-6 leading-[1.08] text-sand ${coverSize(headline, tail)}`}>
        {headline}
        {tail && (
          <>
            <br />
            <em>{tail}</em>
          </>
        )}
      </h1>
      {quote && <p className="mt-6 max-w-[135mm] text-[11.5pt] leading-relaxed text-sand/90">{quote}</p>}
      {lines && lines.length > 0 && (
        <div className="mt-6 max-w-[135mm] space-y-1 text-[11pt] leading-relaxed text-sand/90">
          {lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      )}
      <p className="mt-9 text-[10pt] font-semibold text-sand/85">
        {who}
        {who && when ? " · " : ""}
        {when}
      </p>
    </div>
  );
}
