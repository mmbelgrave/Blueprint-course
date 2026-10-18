"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RequireUser, Shell } from "@/components/Shell";
import { isFree } from "@/lib/access-app";
import { useApp } from "@/lib/app-state";
import { takeSignup } from "@/lib/signup-source";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AUD", "CAD", "ZAR", "BRL"];

function ConsentForm() {
  const { entitlements, profile, saveProfile } = useApp();
  // A free account has no AI partner and no picture board, so it is not asked
  // to agree to either. The full page is asked for when the course is bought.
  const free = isFree(entitlements);
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [currency, setCurrency] = useState(profile?.currency ?? "EUR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  return (
    <form
      className="space-y-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(false);
        try {
          // Where they came from and the updates tick waited in this browser
          // while they fetched the code from their email (§6.2).
          const signup = takeSignup();
          await saveProfile({
            first_name: firstName.trim(),
            language: "en",
            currency,
            came_from: signup.from ?? profile?.came_from ?? null,
            wants_updates: signup.wants_updates || (profile?.wants_updates ?? false),
          });
          router.push("/modules");
        } catch {
          setError(true);
          setSaving(false);
        }
      }}
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-pine">Before you start</h2>
        <p>You will share personal things here. So you should know what happens with them.</p>
        {free ? (
          <ul className="list-disc space-y-2 pl-6">
            <li>We store what you type, so it is still there when you come back.</li>
            <li>Nobody else reads it. There is no AI partner on a free account.</li>
            <li>You can delete everything at any time.</li>
          </ul>
        ) : (
          <ul className="list-disc space-y-2 pl-6">
            <li>
              We store your answers, the pictures you add to your board, your chats with your AI partner, and a short
              summary of what you wrote.
            </li>
            <li>
              Your pictures stay in your own account. Your AI partner reads only the line you write under a picture.
            </li>
            <li>
              If you switch your AI partner on, an AI model reads your answers to help you think. It does not decide
              anything for you.
            </li>
            <li>You can see what your AI partner remembers about you, and change it.</li>
            <li>You can delete everything at any time.</li>
          </ul>
        )}
        {!free && (
          <p className="text-sm text-stone">
            Read more on the <Link href="/privacy" className="underline">privacy page</Link>.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <label className="block">
          <span className="mb-1 block font-medium">Your first name</span>
          <input
            required
            className="field-input max-w-sm"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </label>
        {!free && (
          <label className="block">
            <span className="mb-1 block font-medium">Your currency for the money questions</span>
            <select
              className="field-input max-w-[10rem]"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
        <p className="text-sm text-stone">
          The app is in English. You may write your answers in your own language.
        </p>
      </section>

      <section className="space-y-4">
        {/* The one thing everybody has to agree to: what is kept, and that it
            can all go. It is an acknowledgement, not a consent, so it is not
            stored — the form simply cannot be sent without it. */}
        <label className="flex gap-3">
          <input type="checkbox" required className="mt-1.5 h-5 w-5 accent-pine" />
          <span>
            I understand that what I write is stored in my own account, and that I can delete everything at any time.{" "}
            <span className="text-stone">(needed to use the app)</span>
          </span>
        </label>

        {/*
            Nothing about the AI partner is asked here (legal review of 18
            October). Consent belongs to the moment it is used: the AI panel
            asks the first time somebody opens it, in words about that panel,
            and Settings is where it can be changed again.
         */}
        {!free && (
          <p className="text-sm text-stone">
            Your AI partner is optional and it is off until you switch it on. It asks you the first time you open it,
            and you can switch it off again in My settings.
          </p>
        )}
      </section>

      <button className="btn btn-primary" disabled={saving}>
        {saving ? "Saving…" : "Let's begin"}
      </button>
      {error && (
        <p role="alert" className="text-ochre">
          This was not saved. Please check your internet and try again.
        </p>
      )}
    </form>
  );
}

export default function Onboarding() {
  return (
    <Shell>
      <RequireUser allowNoProfile>
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 sm:p-8">
          <ConsentForm />
        </div>
      </RequireUser>
    </Shell>
  );
}
