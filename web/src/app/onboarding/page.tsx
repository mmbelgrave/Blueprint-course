"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AUD", "CAD", "ZAR", "BRL"];

function ConsentForm() {
  const { profile, saveProfile } = useApp();
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [currency, setCurrency] = useState(profile?.currency ?? "EUR");
  const [consentAi, setConsentAi] = useState(profile?.consent_ai ?? false);
  const [founder, setFounder] = useState(profile?.consent_founder_access ?? false);
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
          await saveProfile({
            first_name: firstName.trim(),
            language: "en",
            currency,
            consent_ai: consentAi,
            consent_founder_access: founder,
          });
          router.push("/dashboard");
        } catch {
          setError(true);
          setSaving(false);
        }
      }}
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-indigo">Before you start</h2>
        <p>You will share personal things here. So you should know what happens with them.</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>We store your answers, your chats with your AI partner, and a short summary of what you wrote.</li>
          <li>An AI model reads your answers to help you think. It does not decide anything for you.</li>
          <li>You can see what your AI partner remembers about you, and change it.</li>
          <li>You can delete everything at any time.</li>
        </ul>
        <p className="text-sm text-muted">
          Read more on the <Link href="/privacy" className="underline">privacy page</Link>.
        </p>
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
        <p className="text-sm text-muted">
          The app is in English. You may write your answers in your own language.
        </p>
      </section>

      <section className="space-y-3">
        <label className="flex gap-3">
          <input
            type="checkbox"
            required
            className="mt-1.5 h-5 w-5 accent-indigo"
            checked={consentAi}
            onChange={(e) => setConsentAi(e.target.checked)}
          />
          <span>
            I understand that an AI model reads my answers to help me, and that I can delete
            everything at any time. <span className="text-muted">(needed to use the app)</span>
          </span>
        </label>
        <label className="flex gap-3">
          <input
            type="checkbox"
            className="mt-1.5 h-5 w-5 accent-indigo"
            checked={founder}
            onChange={(e) => setFounder(e.target.checked)}
          />
          <span>
            Mwata may read my answers and my AI summary to guide me.{" "}
            <span className="text-muted">(optional — you can change this later)</span>
          </span>
        </label>
      </section>

      <button className="btn btn-primary" disabled={saving}>
        {saving ? "Saving…" : "Let's begin"}
      </button>
      {error && (
        <p role="alert" className="text-amber">
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
