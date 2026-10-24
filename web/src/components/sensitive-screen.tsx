"use client";
/*
 * The sensitive-details question, for somebody who already had an account
 * (lawyer, 24 October, item B1).
 *
 * The question itself lives on the first screen after the first sign-in, so
 * everybody who signs up from now on meets it there. The lawyer asked for the
 * people who were already here as well: they must see the same screen at
 * their next sign-in, not have to find it in Settings.
 *
 * So this stands in front of the app, once. The tick is optional and empty.
 * Continue records whichever answer they give, including a no, and that
 * record is what stops them being asked again.
 *
 * It can be stepped past only by answering, because "Continue" with an empty
 * box is an answer. Nothing in the app behaves differently either way, which
 * the footnote says in the lawyer's own words.
 */
import Link from "next/link";
import { useState } from "react";
import { saveConsent } from "@/components/ai-consent";
import { SENSITIVE_TEXT } from "@/lib/consent";

export function SensitiveScreen() {
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-2xl bg-white p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-pine">One thing before you carry on</h1>
      <p>{SENSITIVE_TEXT.lead}</p>
      <label className="flex gap-3">
        <input
          type="checkbox"
          className="mt-1.5 h-5 w-5 shrink-0 accent-pine"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        />
        <span>{SENSITIVE_TEXT.box}</span>
      </label>
      <p className="text-sm text-stone">{SENSITIVE_TEXT.footnote}</p>
      <p className="text-sm text-stone">
        You can read what we do with your answers on the{" "}
        <Link href="/privacy" className="underline">
          privacy page
        </Link>
        .
      </p>
      <p className="flex justify-center">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setProblem(false);
            const ok = await saveConsent({ sensitive: agree }, "settings");
            if (!ok) {
              setProblem(true);
              setBusy(false);
            }
            /* On success the answer is in the consent state, and the app
               appears behind this screen by itself. */
          }}
        >
          {busy ? "Saving…" : "Continue"}
        </button>
      </p>
      {problem && (
        <p role="alert" className="text-center text-sm text-ochre">
          That was not saved. Please check your internet and try again.
        </p>
      )}
    </div>
  );
}
