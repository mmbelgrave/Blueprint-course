"use client";
/*
 * Asking before the first word is sent (legal review of 18 October, part 1).
 *
 * The screen lives inside the AI panel, where the AI partner is: that is the
 * moment the question belongs to, not a tick buried in sign-up that somebody
 * agreed to while fetching their code from their email.
 *
 * Two boxes, both empty when the screen opens. The first is the one the AI
 * partner needs. The second is explicit consent for special categories of
 * data, and the partner works without it. Pressing "Not now" is recorded too,
 * so nobody is asked the same question twice over.
 *
 * Nothing here decides anything. The server refuses every AI request without a
 * granted row at the current wording, and this is only what the person sees.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_DISCLOSURE, CONSENT_TEXT, type ConsentState } from "@/lib/consent";

type Snapshot = { state: ConsentState | null; failed: boolean };

/*
 * One fetch for the page. The panel and the draft button both ask, and asking
 * twice on every page would be two requests for one answer.
 */
let cache: Snapshot | null = null;
let pending: Promise<Snapshot> | null = null;
const watchers = new Set<(s: Snapshot) => void>();

function load(force = false): Promise<Snapshot> {
  if (!force && cache) return Promise.resolve(cache);
  if (!force && pending) return pending;
  pending = fetch("/api/consent", { cache: "no-store" })
    .then(async (r) => (r.ok ? { state: (await r.json()) as ConsentState, failed: false } : { state: null, failed: true }))
    .catch(() => ({ state: null, failed: true }))
    .then((snapshot) => {
      cache = snapshot;
      pending = null;
      for (const watcher of watchers) watcher(snapshot);
      return snapshot;
    });
  return pending;
}

/** Tell every screen on this page that the answer changed. */
export function consentChanged(state: ConsentState) {
  cache = { state, failed: false };
  for (const watcher of watchers) watcher(cache);
}

/**
 * Is the AI partner on, as far as this page already knows?
 *
 * For the places that only want to avoid a pointless request, not draw
 * anything: no fetch, no hook, and false until the answer has arrived. The
 * server decides either way.
 */
export function aiConsentIsOn(): boolean {
  return cache?.state?.ai === true;
}

export function useAiConsent() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(cache);

  useEffect(() => {
    watchers.add(setSnapshot);
    load().then(setSnapshot, () => undefined);
    return () => {
      watchers.delete(setSnapshot);
    };
  }, []);

  return {
    state: snapshot?.state ?? null,
    failed: snapshot?.failed ?? false,
    loading: snapshot === null,
    reload: () => load(true),
  };
}

/** Send an answer. Returns false if it could not be written. */
export async function saveConsent(
  answer: { ai?: boolean; special?: boolean; founder?: boolean },
  from: "app" | "settings" = "app",
): Promise<boolean> {
  try {
    const res = await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...answer, from }),
    });
    if (!res.ok) return false;
    consentChanged((await res.json()) as ConsentState);
    return true;
  } catch {
    return false;
  }
}

export function AiConsentScreen({ onNotNow }: { onNotNow?: () => void }) {
  const [agree, setAgree] = useState(false);
  const [special, setSpecial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function answer(ai: boolean) {
    setBusy(true);
    setError(false);
    const ok = await saveConsent({ ai, special: ai && special });
    if (!ok) {
      setError(true);
      setBusy(false);
      return;
    }
    if (!ai) onNotNow?.();
  }

  return (
    <div className="mt-4 rounded-lg bg-sand p-4">
      <p className="font-semibold text-pine">Your AI partner is optional</p>
      {CONSENT_DISCLOSURE.map((paragraph) => (
        <p key={paragraph.slice(0, 24)} className="mt-2 text-sm">
          {paragraph}
        </p>
      ))}
      <p className="mt-1 text-sm text-stone">
        You can read and delete those notes under{" "}
        <Link href="/me" className="underline">
          What my AI partner knows
        </Link>
        .
      </p>

      <label className="mt-4 flex gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 accent-pine"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        />
        <span>
          {CONSENT_TEXT.ai} <span className="text-stone">(needed for your AI partner)</span>
        </span>
      </label>
      <label className="mt-3 flex gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 accent-pine"
          checked={special}
          onChange={(e) => setSpecial(e.target.checked)}
        />
        <span>
          {CONSENT_TEXT.ai_special} <span className="text-stone">(optional)</span>
        </span>
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button type="button" className="btn btn-primary" disabled={!agree || busy} onClick={() => answer(true)}>
          {busy ? "Saving…" : "Switch on my AI partner"}
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => answer(false)}>
          Not now
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-ochre">
          That was not saved. Please check your internet and try again.
        </p>
      )}
      <p className="mt-3 text-sm text-stone">
        You can switch it off again in My settings at any time, and everything else in the course keeps working.
      </p>
    </div>
  );
}

/** Switched on once, switched off since: a sentence and a way back. */
export function AiSwitchedOff({ onAsk }: { onAsk: () => void }) {
  return (
    <div className="mt-4 rounded-lg bg-sand p-3 text-sm text-stone">
      Your AI partner is switched off.{" "}
      <button type="button" className="text-pine underline" onClick={onAsk}>
        Switch it on
      </button>
      , or change it in{" "}
      <Link href="/settings" className="underline">
        My settings
      </Link>
      .
    </div>
  );
}
