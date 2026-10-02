"use client";
// Signing in with a code from the email, and nothing else. Supabase gives one
// token per email: the link and the code are the same thing, so a mail scanner
// that opens the link (Outlook Safe Links) burns the code with it. The email
// therefore carries the code alone - see the template in Supabase.
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { cleanCode, friendlySignInError, MAX_CODE, MIN_CODE } from "@/lib/auth-errors";
import { auth, isSupabaseConfigured, NotInvitedError } from "@/lib/backend";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [notInvited, setNotInvited] = useState(false);
  const linkError = useSearchParams().get("error") === "link";
  const { reload } = useApp();
  const router = useRouter();

  const goIn = async () => {
    await reload();
    router.push("/dashboard");
  };

  const sendCode = async () => {
    setBusy(true);
    setProblem(null);
    setNotInvited(false);
    try {
      await auth.sendMagicLink(email.trim());
      setStep("code");
    } catch (e) {
      if (e instanceof NotInvitedError) setNotInvited(true);
      else setProblem(friendlySignInError(e instanceof Error ? e.message : ""));
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-4">
        <p>
          The app runs in preview mode. There are no accounts yet, so you can try the
          workbook right away. Your answers stay in this browser only.
        </p>
        <button
          className="btn btn-primary"
          onClick={async () => {
            await auth.sendMagicLink("");
            await goIn();
          }}
        >
          Continue in preview mode
        </button>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-pine">Check your email.</p>
          <p className="mt-1">
            We sent a code to <strong>{email}</strong>. Type it here. It works for one hour.
          </p>
        </div>

        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setProblem(null);
            try {
              await auth.verifyCode(email.trim(), code);
              await goIn();
            } catch (err) {
              setProblem(friendlySignInError(err instanceof Error ? err.message : ""));
              setBusy(false);
            }
          }}
        >
          <label className="block">
            <span className="mb-1 block font-medium">The code from the email</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              placeholder="123456"
              maxLength={MAX_CODE}
              className="field-input max-w-[15rem] text-center text-2xl tracking-[0.3em] tabular"
              value={code}
              onChange={(e) => setCode(cleanCode(e.target.value))}
            />
          </label>
          <button className="btn btn-primary" disabled={busy || code.length < MIN_CODE}>
            {busy ? "One moment…" : "Sign in"}
          </button>
        </form>

        {problem && (
          <p role="alert" className="rounded-lg bg-ochre-soft p-3">
            {problem}
          </p>
        )}

        <p className="text-sm text-stone">
          No email at all?{" "}
          <button type="button" className="text-pine underline" disabled={busy} onClick={sendCode}>
            Send a new code
          </button>{" "}
          · Wrong address?{" "}
          <button
            type="button"
            className="text-pine underline"
            onClick={() => {
              setStep("email");
              setCode("");
              setProblem(null);
            }}
          >
            Start again
          </button>
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void sendCode();
      }}
    >
      {linkError && (
        <p className="rounded-lg bg-ochre-soft p-3">
          That link did not work. We send codes now instead of links. Ask for one below and type it.
        </p>
      )}
      <p>No password needed. We send you a code by email.</p>
      <label className="block">
        <span className="mb-1 block font-medium">Your email</span>
        <input
          type="email"
          required
          autoComplete="email"
          className="field-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Sending…" : "Send me a code"}
      </button>
      {problem && (
        <p role="alert" className="text-ochre">
          {problem}
        </p>
      )}
      {notInvited && (
        <p className="rounded-lg bg-ochre-soft p-3">
          This address cannot start an account right now. Used a different address before? Try that one. Otherwise
          write to info@belgraveconsultancy.com and we will sort it out.
        </p>
      )}
    </form>
  );
}

export default function SignIn() {
  return (
    <Shell>
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 sm:p-8">
        <h1 className="mb-4 text-2xl font-bold text-pine">Sign in</h1>
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </Shell>
  );
}
