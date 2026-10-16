"use client";
/**
 * On a page in a household: who answers this one, and what to do when both of
 * you wrote the same box (spec §6.8).
 *
 * Draws nothing at all for a person working alone, which is almost everybody.
 */
import { useApp } from "@/lib/app-state";
import { pageKind } from "@/lib/together-app";
import { answerText } from "@/lib/answer-text";
import type { Exercise } from "@/lib/content";
import { exerciseFields } from "@/lib/content";

/** Their answer as a line of text, so a box of any kind can be compared. */
function asText(exercise: Exercise, fieldId: string, value: unknown): string {
  const field = exerciseFields(exercise).find((f) => f.id === fieldId);
  if (!field) return typeof value === "string" ? value : JSON.stringify(value ?? "");
  return answerText(field, value, "; ") ?? "";
}

export function SharedNote({ exercise }: { exercise: Exercise }) {
  const { household, conflicts, settle, dismissConflict } = useApp();
  if (household.role === "alone") return null;

  const them = household.otherName ?? "your partner";
  const kind = pageKind(exercise.id);
  const mine = Object.entries(conflicts).filter(([, c]) => c.exerciseId === exercise.id);

  return (
    <>
      {kind === "ours" && (
        <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm">
          <strong className="text-success">You answer this one together.</strong> Either of you can write here, and
          what you write is on {them}&rsquo;s screen too.
        </p>
      )}
      {kind === "mine" && (
        <p className="rounded-2xl bg-ochre-soft px-4 py-3 text-sm">
          <strong className="text-ochre">You each answer this one yourself.</strong> {them} cannot see what you write
          here, and you cannot see theirs.
        </p>
      )}
      {mine.map(([key, clash]) => (
        <div key={key} className="rounded-2xl bg-ochre-soft p-4">
          <p className="text-sm">
            <strong className="text-ochre">
              {clash.name ?? them} wrote this one too, after you opened the page.
            </strong>{" "}
            Nothing is lost. Choose which answer to keep.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-white p-3 text-sm">
              <p className="font-semibold text-pine">Yours</p>
              <p className="mt-1 whitespace-pre-wrap">{asText(exercise, clash.fieldId, clash.mine) || "(empty)"}</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-3 text-sm">
              <p className="font-semibold text-pine">{clash.name ?? them}&rsquo;s</p>
              <p className="mt-1 whitespace-pre-wrap">{asText(exercise, clash.fieldId, clash.theirs) || "(empty)"}</p>
            </div>
          </div>
          {/* After a choice the other answer stays here until the page is
              left, so a decision made in a hurry can still be undone. */}
          {clash.settled ? (
            <p className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-stone">
                {clash.settled === "mine" ? "You kept yours." : `You took ${clash.name ?? them}'s answer.`}
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => settle(key, clash.settled === "mine" ? "theirs" : "mine")}
              >
                {clash.settled === "mine" ? "Use theirs after all" : "Put mine back"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => dismissConflict(key)}>
                Done
              </button>
            </p>
          ) : (
            <p className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-primary" onClick={() => settle(key, "mine")}>
                Keep mine
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => settle(key, "theirs")}>
                Use theirs
              </button>
            </p>
          )}
        </div>
      ))}
    </>
  );
}
