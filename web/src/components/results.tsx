"use client";
// Milestone 5 on the page: "Help me draft this" (AI partner drafts from the
// person's own answers) and "How did this part feel?" (pilot feedback).
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { isSupabaseConfigured, store, type Feedback } from "@/lib/backend";

export type Drafts = Record<string, string>;

export function DraftHelper({ pageId, onDrafts }: { pageId: string; onDrafts: (d: Drafts) => void }) {
  const { user, profile } = useApp();
  const [busy, setBusy] = useState(false);
  const [has, setHas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show an earlier draft again when the person comes back to the page.
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;
    let cancelled = false;
    store.loadDraft(user.id, pageId).then(
      (d) => {
        if (cancelled || !d) return;
        onDrafts(d);
        setHas(true);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [user, pageId, onDrafts]);

  if (!isSupabaseConfigured) return null;
  if (!profile?.consent_ai) {
    return (
      <p className="rounded-lg bg-sand p-3 text-sm text-muted">
        Your AI partner can write a first draft of this page from your answers. It is switched off in{" "}
        <Link href="/settings" className="underline">
          My settings
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-indigo/30 p-4">
      <p className="text-sm">
        Your AI partner can write a first draft from your own answers. You decide what to keep and change.
      </p>
      <button
        type="button"
        className="btn btn-ghost text-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/draft", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ exerciseId: pageId }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error);
            onDrafts(body.drafts);
            setHas(true);
          } catch (e) {
            setError((e as Error).message || "Your AI partner needs a moment. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Writing a draft…" : has ? "Write a new draft" : "Help me draft this"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-amber">
          {error}
        </p>
      )}
    </div>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
      <path
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
        className={filled ? "fill-amber stroke-amber" : "fill-none stroke-muted"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Brief 4.5: "How did this part feel?" (1–5 stars) + "What helped? What was difficult?" */
export function PartFeedback({ partId }: { partId: string }) {
  const { user } = useApp();
  const [saved, setSaved] = useState<Feedback | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    store.loadFeedback(user.id, partId).then(
      (f) => {
        if (cancelled || !f) return;
        setSaved(f);
        setRating(f.rating);
        setComment(f.comment);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [user, partId]);

  if (saved && !editing) {
    return (
      <section className="rounded-2xl border border-sand-deep p-5">
        <p className="font-semibold text-green">Thank you for your feedback.</p>
        <button className="mt-1 text-sm text-muted underline" onClick={() => setEditing(true)}>
          Change my answer
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-sand-deep p-5">
      <h3 className="font-semibold text-indigo">How did this part feel?</h3>
      <div className="flex gap-1" role="radiogroup" aria-label="How did this part feel? 1 to 5 stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
            onClick={() => setRating(n)}
          >
            <Star filled={rating !== null && n <= rating} />
          </button>
        ))}
      </div>
      <label className="block">
        <span className="mb-1 block text-sm">What helped? What was difficult? (optional)</span>
        <textarea
          className="field-input"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>
      <button
        className="btn btn-primary text-sm"
        disabled={rating === null || state === "saving" || !user}
        onClick={async () => {
          if (!user) return;
          setState("saving");
          const f = { rating, comment: comment.trim() };
          try {
            await store.saveFeedback(user.id, partId, f);
            setSaved(f);
            setEditing(false);
            setState("idle");
          } catch {
            setState("error");
          }
        }}
      >
        {state === "saving" ? "Sending…" : "Send"}
      </button>
      {state === "error" && (
        <p role="alert" className="text-sm text-amber">
          This was not saved. Please check your internet and try again.
        </p>
      )}
    </section>
  );
}
