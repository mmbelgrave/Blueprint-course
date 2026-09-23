"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { auth, isSupabaseConfigured, NotInvitedError } from "@/lib/backend";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "not-invited">("idle");
  const linkError = useSearchParams().get("error") === "link";
  const { reload } = useApp();
  const router = useRouter();

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
            await reload();
            router.push("/dashboard");
          }}
        >
          Continue in preview mode
        </button>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div className="space-y-3">
        <p className="text-lg font-semibold text-indigo">Check your email.</p>
        <p>
          We sent a link to <strong>{email}</strong>. Click the link to sign in. You can
          close this page.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        try {
          await auth.sendMagicLink(email.trim());
          setState("sent");
        } catch (e) {
          setState(e instanceof NotInvitedError ? "not-invited" : "error");
        }
      }}
    >
      {linkError && (
        <p className="rounded-lg bg-amber-soft p-3">
          This link did not work. It may be old or already used. Please ask for a new one.
        </p>
      )}
      <p>No password needed. We send you a link to sign in.</p>
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
      <button className="btn btn-primary" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send me a link"}
      </button>
      {state === "error" && (
        <p className="text-amber">Something went wrong. Please try again in a minute.</p>
      )}
      {state === "not-invited" && (
        <p className="rounded-lg bg-amber-soft p-3">
          This email is not on the list yet. The Blueprint is open to invited people
          only for now. Used a different address before? Try that one.
        </p>
      )}
    </form>
  );
}

export default function SignIn() {
  return (
    <Shell>
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 sm:p-8">
        <h1 className="mb-4 text-2xl font-bold text-indigo">Sign in</h1>
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </Shell>
  );
}
