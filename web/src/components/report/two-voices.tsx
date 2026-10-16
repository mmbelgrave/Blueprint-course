/**
 * Two people on one page (spec §6.8, slice 3).
 *
 * The documents print what a household shares once, because it is one set of
 * answers. These are the parts where there are two, and printing only one of
 * them would be a lie about a plan two people are making: the words they each
 * chose, the must-haves only one of them has, what each of them decided, and
 * the line they agreed on afterwards.
 *
 * Every block here draws nothing at all when there is only one voice, which is
 * every document today.
 */
import type { Overlap } from "@/lib/compare";

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[7.5pt] uppercase tracking-[0.14em] text-stone">{children}</p>
);

/** The words both of them chose, and the ones only one did. */
export function SharedAndApart({
  overlap,
  mine,
  theirs,
  what,
}: {
  overlap: Overlap;
  mine: string;
  theirs: string;
  what: string;
}) {
  const nothing = !overlap.both.length && !overlap.onlyMine.length && !overlap.onlyTheirs.length;
  if (nothing) return null;
  return (
    <div className="mt-5 border-t border-line pt-4">
      <Label>
        {what}, {mine} and {theirs}
      </Label>
      {overlap.both.length > 0 && (
        <p className="mt-2 text-[10.5pt]">
          <span className="font-semibold text-pine">Both: </span>
          {overlap.both.join(". ")}.
        </p>
      )}
      {overlap.onlyMine.length > 0 && (
        <p className="mt-1 text-[10.5pt] text-stone">
          <span className="font-semibold">{mine} only: </span>
          {overlap.onlyMine.join("; ")}.
        </p>
      )}
      {overlap.onlyTheirs.length > 0 && (
        <p className="mt-1 text-[10.5pt] text-stone">
          <span className="font-semibold">{theirs} only: </span>
          {overlap.onlyTheirs.join("; ")}.
        </p>
      )}
    </div>
  );
}

/** Two answers to the same question, as they were written. */
export function SideBySide({
  what,
  mine,
  theirs,
  mineName,
  theirName,
}: {
  what: string;
  mine: string;
  theirs: string;
  mineName: string;
  theirName: string;
}) {
  if (!mine.trim() && !theirs.trim()) return null;
  return (
    <div className="mt-5 border-t border-line pt-4">
      <Label>{what}</Label>
      <div className="mt-2 grid grid-cols-2 gap-5">
        <div>
          <p className="text-[9pt] font-semibold text-pine">{mineName}</p>
          <p className="mt-1 text-[10.5pt] leading-relaxed">{mine || "Not written down."}</p>
        </div>
        <div>
          <p className="text-[9pt] font-semibold text-pine">{theirName}</p>
          <p className="mt-1 text-[10.5pt] leading-relaxed">{theirs || "Not written down."}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * The line the two of them agreed on.
 *
 * It is printed larger than either of their own answers, because it is the one
 * the plan rests on. Nothing is drawn until they have written it.
 */
export function Agreed({ what, line }: { what: string; line: string }) {
  if (!line.trim()) return null;
  return (
    <div className="mt-5 rounded-lg border-2 border-pine p-4">
      <Label>{what}</Label>
      <p className="display mt-1 text-[15pt] leading-snug text-pine">{line}</p>
    </div>
  );
}
