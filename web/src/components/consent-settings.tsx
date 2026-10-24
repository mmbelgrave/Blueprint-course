"use client";
/*
 * "Who may read your answers", in Settings (legal review of 18 October).
 *
 * These ticks are not part of the profile form and are not saved with the
 * Save button. Each one is written the moment it changes, because each one is
 * a consent with a minute attached, and a consent that waits for a second
 * button is a consent nobody can prove.
 *
 * Switching the AI partner off stops the next request, and then asks what
 * should happen to the chats and notes it has already made (lawyer, 24
 * October, item B3). The third tick is the sensitive-details one from the
 * first screen (item B1): it belongs to the app rather than to the AI
 * partner, so it stands on its own and can be taken back here.
 */
import Link from "next/link";
import { useState } from "react";
import { saveConsent, useAiConsent } from "@/components/ai-consent";
import { CONSENT_TEXT, SENSITIVE_TEXT } from "@/lib/consent";
import { CHAT_MONTHS } from "@/lib/retention";

const day = (iso: string | null) =>
  !iso
    ? ""
    : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** Asked once, the moment the AI partner is switched off. */
function AfterSwitchingOff({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <div className="rounded-lg bg-sand p-4">
      <p className="font-semibold text-pine">Your chats and your AI partner&rsquo;s notes</p>
      <p className="mt-1 text-sm">
        They are still here. You can delete them now, or keep them in case you switch your AI partner on again.
      </p>
      <p className="mt-3 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="btn btn-ochre"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setProblem(null);
            try {
              const res = await fetch("/api/ai/erase", { method: "POST" });
              if (!res.ok) throw new Error((await res.json()).error);
              onDone();
            } catch (e) {
              setProblem((e as Error).message || "That did not work. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Deleting…" : "Delete my chats and notes now"}
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={onDone}>
          Keep them, switched off
        </button>
      </p>
      <p className="mt-2 text-sm text-stone">
        If you keep them and your AI partner stays off, they are deleted after {CHAT_MONTHS} months.
      </p>
      {problem && (
        <p role="alert" className="mt-2 text-sm text-ochre">
          {problem}
        </p>
      )}
    </div>
  );
}

export function ConsentSettings() {
  const { state, loading, failed } = useAiConsent();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [askAboutChats, setAskAboutChats] = useState(false);
  const [erased, setErased] = useState(false);

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

  async function change(what: "ai" | "special" | "sensitive", value: boolean) {
    setBusy(what);
    setError(false);
    const ok = await saveConsent({ [what]: value }, "settings");
    if (!ok) setError(true);
    // Switching the AI partner off is the moment to ask about what it made.
    if (ok && what === "ai" && !value) {
      setErased(false);
      setAskAboutChats(true);
    }
    if (ok && what === "ai" && value) setAskAboutChats(false);
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

      {askAboutChats && !state.ai && !erased && (
        <AfterSwitchingOff
          onDone={() => {
            setAskAboutChats(false);
            setErased(true);
          }}
        />
      )}
      {erased && <p className="text-sm text-stone">Your chats and notes are deleted.</p>}

      {/* The sensitive-details box from the first screen (item B1). Not about
          the AI partner, so it is asked and taken back on its own. */}
      <div className="space-y-2 border-t border-line pt-4">
        <p className="text-sm">{SENSITIVE_TEXT.lead}</p>
        <label className="flex gap-3">
          <input
            type="checkbox"
            className="mt-1.5 h-5 w-5 shrink-0 accent-pine"
            checked={state.sensitive}
            disabled={busy !== null}
            onChange={(e) => change("sensitive", e.target.checked)}
          />
          <span>
            {SENSITIVE_TEXT.box}
            <span className="block text-sm text-stone">{SENSITIVE_TEXT.footnote}</span>
          </span>
        </label>
      </div>

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
