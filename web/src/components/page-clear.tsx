"use client";
/*
 * "Was this page clear?" (spec §6.7).
 *
 * The part feedback — stars and a comment at the end of a part — answers "how
 * did that feel". This answers something smaller and more useful: did this
 * page land. On every exercise page, so that when somebody gets stuck Mwata
 * learns which page did it, not which part.
 *
 * It is deliberately two words and two buttons. A form at the foot of every
 * page would be ignored by the third page and resented by the tenth; one line
 * can be answered without stopping. "Not quite" opens a box, because that is
 * the answer worth a sentence — and the box can be skipped.
 */
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { isSupabaseConfigured, store, type PageNote } from "@/lib/backend";

export function PageClear({ exerciseId }: { exerciseId: string }) {
  const { user } = useApp();
  const [saved, setSaved] = useState<PageNote | null>(null);
  const [asking, setAsking] = useState(false);
  const [comment, setComment] = useState("");
  const [problem, setProblem] = useState(false);

  /*
   * What they said last time, so coming back to a page does not ask again.
   * The caller keys this component by the page, so there is nothing to reset
   * here when somebody moves on: they get a new one.
   */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    store.loadPageNote(user.id, exerciseId).then(
      (n) => {
        if (cancelled || !n) return;
        setSaved(n);
        setComment(n.comment);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [user, exerciseId]);

  if (!isSupabaseConfigured && !user) return null;

  const save = async (note: PageNote) => {
    if (!user) return;
    try {
      await store.savePageNote(user.id, exerciseId, note);
      setSaved(note);
      setProblem(false);
    } catch {
      setProblem(true);
    }
  };

  /* Answered, and not in the middle of writing more: one quiet line. */
  if (saved && !asking) {
    return (
      <p className="print:hidden text-center text-sm text-stone">
        {saved.clear ? "Thank you — noted as clear." : "Thank you. Mwata reads these."}{" "}
        <button className="underline" onClick={() => setAsking(true)}>
          {saved.clear ? "Change my answer" : saved.comment ? "Change what I wrote" : "Add what was missing"}
        </button>
      </p>
    );
  }

  return (
    <div className="print:hidden rounded-2xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="text-sm">Was this page clear?</span>
        {/* The answer they have given is the filled button: .btn-ghost sets its
            own background, so a Tailwind colour on top of it would not show. */}
        <button
          className={`btn px-4 py-1 text-sm ${saved?.clear ? "btn-primary" : "btn-ghost"}`}
          onClick={() => save({ clear: true, comment: "" })}
        >
          Yes
        </button>
        <button
          className={`btn px-4 py-1 text-sm ${saved && !saved.clear ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            setAsking(true);
            if (!saved || saved.clear) void save({ clear: false, comment });
          }}
        >
          Not quite
        </button>
      </div>

      {asking && (
        <div className="mt-4">
          <label className="block">
            <span className="mb-1 block text-sm text-stone">What was missing? (optional)</span>
            <textarea
              className="field-input"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>
          <p className="mt-3 flex justify-center gap-2">
            <button
              className="btn btn-primary text-sm"
              onClick={async () => {
                await save({ clear: false, comment: comment.trim() });
                setAsking(false);
              }}
            >
              Send
            </button>
            <button className="btn btn-ghost text-sm" onClick={() => setAsking(false)}>
              Not now
            </button>
          </p>
        </div>
      )}

      {problem && (
        <p role="alert" className="mt-2 text-center text-sm text-ochre">
          That was not saved. Please check your internet and try again.
        </p>
      )}
    </div>
  );
}
