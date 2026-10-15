"use client";
/**
 * Two people's answers to one page, side by side (spec §6.8, slice 2).
 *
 * Before both of them have written, this is a closed door with a line of
 * explanation: that rule is the reason the comparison is worth anything. While
 * it waits it asks again every twenty seconds, so the answer appears by itself
 * when the other person finishes in the next room.
 */
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { answerText } from "@/lib/answer-text";
import { agreedWords, differences, rows as compareRows, same } from "@/lib/compare";
import { fetchPageCompare, setPagePrivate, WAIT_POLL_MS, type PageCompare } from "@/lib/compare-client";
import { exerciseFields, type Exercise } from "@/lib/content";
import { agreedField, mayKeepPrivate, wantsAgreement } from "@/lib/together-app";

const asText = (exercise: Exercise, fieldId: string, value: unknown): string => {
  const field = exerciseFields(exercise).find((f) => f.id === fieldId);
  if (!field) return typeof value === "string" ? value : "";
  return answerText(field, value, "; ") ?? "";
};

const labelOf = (exercise: Exercise, fieldId: string): string =>
  exerciseFields(exercise).find((f) => f.id === fieldId)?.label ?? "";

function Waiting({ why, them }: { why: PageCompare["waiting"]; them: string }) {
  const lines: Record<string, string> = {
    "only-them": `${them} has written this one. You will see their answer as soon as yours is in.`,
    "only-me": `You have written this one. ${them} has not yet, so there is nothing to compare.`,
    neither: `Neither of you has written this one yet. When you both have, your answers appear side by side.`,
    "theirs-private": `${them} is keeping this page private, which is their choice to make.`,
  };
  return (
    <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-stone">
      {lines[why ?? "neither"]}
    </p>
  );
}

function Private({ exerciseId, on }: { exerciseId: string; on: boolean }) {
  const [keep, setKeep] = useState(on);
  const [busy, setBusy] = useState(false);
  return (
    <label className="mt-3 flex items-start gap-2 text-sm text-stone">
      <input
        type="checkbox"
        className="mt-1"
        checked={keep}
        disabled={busy}
        onChange={async (e) => {
          const next = e.target.checked;
          setBusy(true);
          setKeep(next);
          const ok = await setPagePrivate(exerciseId, next);
          if (!ok) setKeep(!next);
          setBusy(false);
        }}
      />
      <span>
        Keep this page to myself. Your partner never sees it, even after you have both written. You can change this
        whenever you like.
      </span>
    </label>
  );
}

export function ComparePanel({ exercise }: { exercise: Exercise }) {
  const { household, answers, setAnswer } = useApp();
  const [state, setState] = useState<PageCompare | null>(null);

  const load = useCallback(() => fetchPageCompare(exercise.id), [exercise.id]);

  useEffect(() => {
    let gone = false;
    load().then((next) => {
      if (!gone && next) setState(next);
    });
    return () => {
      gone = true;
    };
  }, [load]);

  // While it waits, ask again now and then: the other person may be writing it
  // in the next room, and nobody should have to reload a page to find out.
  const waiting = Boolean(state && !state.may && state.waiting !== "theirs-private");
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => {
      load().then((next) => next && setState(next));
    }, WAIT_POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, load]);

  if (household.role === "alone" || !state) return null;

  const them = state.theirName ?? household.otherName ?? "your partner";
  const canHide = mayKeepPrivate(exercise.id);

  if (!state.may) {
    return (
      <div className="rounded-2xl bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ochre">You and {them}</h2>
        <div className="mt-3">
          <Waiting why={state.waiting} them={them} />
        </div>
        {canHide && <Private exerciseId={exercise.id} on={state.minePrivate} />}
      </div>
    );
  }

  const fieldIds = exerciseFields(exercise).map((f) => f.id);
  const rows = compareRows(fieldIds, answers[exercise.id], state.theirs ?? {}, [agreedField]);
  const both = agreedWords(rows);
  const apart = differences(rows);
  const agreed = (answers[exercise.id]?.[agreedField] as string) ?? "";

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ochre">You and {them}</h2>

      {rows.map((row) => (
        <div key={row.fieldId}>
          {labelOf(exercise, row.fieldId) && (
            <p className="text-sm font-semibold text-pine">{labelOf(exercise, row.fieldId)}</p>
          )}
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-line p-3 text-sm">
              <p className="font-semibold text-pine">You</p>
              {row.kind === "list" ? (
                <ul className="mt-1 list-disc pl-5">
                  {row.mine.map((line) => (
                    <li key={line} className={row.overlap.both.some((b) => same(b, line)) ? "font-semibold text-success" : ""}>
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 whitespace-pre-wrap">{asText(exercise, row.fieldId, row.mine) || "(empty)"}</p>
              )}
            </div>
            <div className="rounded-lg border border-line p-3 text-sm">
              <p className="font-semibold text-pine">{them}</p>
              {row.kind === "list" ? (
                <ul className="mt-1 list-disc pl-5">
                  {row.theirs.map((line) => (
                    <li
                      key={line}
                      className={row.overlap.both.some((b) => same(b, line)) ? "font-semibold text-success" : ""}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 whitespace-pre-wrap">{asText(exercise, row.fieldId, row.theirs) || "(empty)"}</p>
              )}
            </div>
          </div>
        </div>
      ))}

      {both.length > 0 && (
        <div className="rounded-xl bg-success-soft p-4 text-sm">
          <p className="font-semibold text-success">You both wrote</p>
          <p className="mt-1">{both.join(". ")}.</p>
        </div>
      )}

      {(apart.mine.length > 0 || apart.theirs.length > 0) && (
        <div className="rounded-xl bg-ochre-soft p-4 text-sm">
          <p className="font-semibold text-ochre">Only one of you wrote it</p>
          {apart.mine.length > 0 && <p className="mt-1">You: {apart.mine.join("; ")}.</p>}
          {apart.theirs.length > 0 && (
            <p className="mt-1">
              {them}: {apart.theirs.join("; ")}.
            </p>
          )}
          <p className="mt-2 text-stone">
            Neither list is the right one. A must-have only one of you has is still a must-have, and Step 3 checks both.
          </p>
        </div>
      )}

      {wantsAgreement(exercise.id) && (
        <div className="rounded-xl border border-line p-4">
          <p className="text-sm font-semibold text-pine">
            {exercise.id === "s3-4.2" ? "The decision you make together" : "The direction you agree on"}
          </p>
          <p className="mt-1 text-sm text-stone">
            One line, in your own words. Either of you can write it, and it is the line your Blueprint prints.
          </p>
          <textarea
            className="mt-2 w-full rounded-lg border border-line p-3"
            rows={3}
            value={agreed}
            onChange={(e) => setAnswer(exercise.id, agreedField, e.target.value)}
          />
        </div>
      )}

      {canHide && <Private exerciseId={exercise.id} on={state.minePrivate} />}
    </div>
  );
}
