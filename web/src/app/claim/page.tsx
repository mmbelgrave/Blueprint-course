"use client";
/*
 * "I bought it, but I cannot get in" (spec §6.1).
 *
 * For the person who paid with one address and signed in with another, and for
 * the rare order whose webhook never arrived. They prove the paying address
 * with a code, and the course moves to the account they are signed in with,
 * keeping everything they have already written.
 *
 * It moves. After this the address that paid has nothing, because a purchase
 * opens one account and only one.
 */
import Link from "next/link";
import { useState } from "react";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { CLAIM_MINUTES, CODE_LENGTH } from "@/lib/claim";

function ClaimForm() {
  const { user, reload } = useApp();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code" | "done">("email");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const post = async (payload: Record<string, string>) => {
    setBusy(true);
    setProblem(null);
    try {
      const r = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      // A crash somewhere else can answer with something that is not JSON;
      // the person should still get a sentence rather than a blank screen.
      const body = await r.json().catch(() => ({}) as { error?: string });
      if (!r.ok) {
        setProblem(body.error ?? "Something went wrong. Please try again, or ask Mwata.");
        return null;
      }
      return body as { message?: string; moved?: number };
    } catch {
      setProblem("We could not reach the app. Please check your internet.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const askForCode = async () => {
    const body = await post({ email });
    if (!body) return;
    setNote(body.message ?? null);
    setStage("code");
  };

  const sendCode = async () => {
    const body = await post({ email, code });
    if (!body) return;
    await reload();
    setStage("done");
  };

  // Named when we know it, so the person can see which account they are about
  // to move the course to. Preview mode has no accounts and so no address.
  const thisAccount = user?.email ? `this account, ${user.email},` : "this account";

  if (stage === "done") {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="display text-3xl text-pine">That is yours now.</h1>
        <p className="mt-3">
          Your course has moved to {user?.email ? `this account, ${user.email}` : "this account"}. Everything you had
          already written is still here.
        </p>
        <Link href="/modules" className="btn btn-primary mt-6 inline-block">
          Go to the course
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="display text-3xl text-pine">Bought it, but cannot get in?</h1>
      <p className="mt-3 text-stone">
        This happens when the email you paid with is not the one you signed in with. Write the address you paid with
        and we send a code to it. Your course then moves to {thisAccount} with everything you have already written.
      </p>

      {stage === "email" ? (
        <div className="mt-6">
          <label className="block text-sm font-medium" htmlFor="paid-with">
            The email you paid with
          </label>
          <input
            id="paid-with"
            type="email"
            autoComplete="email"
            className="input mt-1 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <button
            type="button"
            className="btn btn-primary mt-4 w-full"
            disabled={busy || !email.includes("@")}
            onClick={askForCode}
          >
            {busy ? "One moment…" : "Send me a code"}
          </button>
        </div>
      ) : (
        <div className="mt-6">
          {note && <p className="rounded-lg bg-sand p-3 text-sm">{note}</p>}
          <label className="mt-4 block text-sm font-medium" htmlFor="claim-code">
            The {CODE_LENGTH}-digit code
          </label>
          <input
            id="claim-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            className="input mt-1 w-full text-center text-2xl tracking-[0.4em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <p className="mt-2 text-sm text-stone">It works for {CLAIM_MINUTES} minutes.</p>
          <button
            type="button"
            className="btn btn-primary mt-4 w-full"
            disabled={busy || code.length < CODE_LENGTH}
            onClick={sendCode}
          >
            {busy ? "One moment…" : "Move my course to this account"}
          </button>
          <button
            type="button"
            className="mt-3 w-full text-sm text-pine underline"
            onClick={() => {
              setStage("email");
              setCode("");
              setProblem(null);
            }}
          >
            Use a different address
          </button>
        </div>
      )}

      {problem && <p className="mt-4 rounded-lg bg-ochre-soft p-3 text-sm">{problem}</p>}

      <p className="mt-8 border-t border-line pt-4 text-center text-sm text-stone">
        Still stuck? <Link href="/help" className="text-pine underline">Ask Mwata</Link> and he will open it by hand.
      </p>
    </div>
  );
}

export default function Claim() {
  return (
    <Shell>
      <RequireUser>
        <ClaimForm />
      </RequireUser>
    </Shell>
  );
}
