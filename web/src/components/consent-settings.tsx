"use client";
/*
 * "Who may read your answers", in Settings (legal review of 18 October).
 *
 * These ticks are not part of the profile form and are not saved with the
 * Save button. Each one is written the moment it changes, because each one is
 * a consent with a minute attached, and a consent that waits for a second
 * button is a consent nobody can prove.
 *
 * Switching the AI partner off stops the next request. The notes it has
 * already made stay until the person deletes them, which the text says.
 */
import Link from "next/link";
import { useState } from "react";
import { saveConsent, useAiConsent } from "@/components/ai-consent";
import { CONSENT_TEXT } from "@/lib/consent";

const day = (iso: string | null) =>
  !iso
    ? ""
    : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export function ConsentSettings() {
  const { state, loading, failed } = useAiConsent();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);

  if (loading) return null;
  if (failed || !state) {
    return (
      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-pine">Who may read your answers</h2>
        <p className="rounded-lg bg-sand p-3 text-sm text-stone">
          These settings could not be read just now. Please reload the page.
        </p>
      </section>
    );
  }

  async function change(what: "ai" | "special" | "founder", value: boolean) {
    setBusy(what);
    setError(false);
    const ok = await saveConsent({ [what]: value }, "settings");
    if (!ok) setError(true);
    setBusy(null);
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-pine">Who may read your answers</h2>

      <label className="flex gap-3">
        <input
          type="checkbox"
          className="mt-1.5 h-5 w-5 shrink-0 accent-pine"
          checked={state.ai}
          disabled={busy !== null}
          onChange={(e) => change("ai", e.target.checked)}
        />
        <span>
          {CONSENT_TEXT.ai}
          <span className="block text-sm text-stone">
            Optional. Switch it off and your AI partner stops helping and stops making notes; everything else in the
            course works exactly as before. The notes it has already made stay until you delete them under{" "}
            <Link href="/me" className="underline">
              What my AI partner knows
            </Link>
            .
            {state.ai && state.aiRecordedAt ? ` You agreed on ${day(state.aiRecordedAt)}.` : ""}
          </span>
        </span>
      </label>

      {state.ai && (
        <label className="ml-8 flex gap-3">
          <input
            type="checkbox"
            className="mt-1.5 h-5 w-5 shrink-0 accent-pine"
            checked={state.special}
            disabled={busy !== null}
            onChange={(e) => change("special", e.target.checked)}
          />
          <span>
            {CONSENT_TEXT.ai_special}
            <span className="block text-sm text-stone">
              Optional. Without this, please keep those things out of the chat.
            </span>
          </span>
        </label>
      )}

      <label className="flex gap-3">
        <input
          type="checkbox"
          className="mt-1.5 h-5 w-5 shrink-0 accent-pine"
          checked={state.founder}
          disabled={busy !== null}
          onChange={(e) => change("founder", e.target.checked)}
        />
        <span>
          {CONSENT_TEXT.founder_access}
          <span className="block text-sm text-stone">You can change this at any time.</span>
        </span>
      </label>

      <p className="text-sm text-stone">
        Each of these is saved the moment you change it, with the date and the words you read.
      </p>
      {error && (
        <p role="alert" className="text-sm text-ochre">
          That was not saved. Please check your internet and try again.
        </p>
      )}
    </section>
  );
}
