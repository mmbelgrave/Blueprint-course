"use client";
// "My settings": change what was chosen on the consent screen (which promised
// "you can change this later"), plus first name and currency.
import Link from "next/link";
import { useState } from "react";
import { RequireUser, Shell } from "@/components/Shell";
import { ThemeChoice } from "@/components/theme-choice";
import { useApp } from "@/lib/app-state";
import type { Profile } from "@/lib/backend";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AUD", "CAD", "ZAR", "BRL"];

function SettingsForm({ profile }: { profile: Profile }) {
  const { saveProfile } = useApp();
  const [draft, setDraft] = useState<Profile>(profile);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const set = (patch: Partial<Profile>) => {
    setDraft({ ...draft, ...patch });
    setState("idle");
  };

  return (
    <form
      className="space-y-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("saving");
        try {
          await saveProfile({ ...draft, first_name: draft.first_name.trim() });
          setState("saved");
        } catch {
          setState("error");
        }
      }}
    >
      <section className="space-y-4">
        <label className="block">
          <span className="mb-1 block font-medium">Your first name</span>
          <input
            required
            className="field-input max-w-sm"
            value={draft.first_name}
            onChange={(e) => set({ first_name: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium">Your currency for the money questions</span>
          <select
            className="field-input max-w-[10rem]"
            value={draft.currency}
            onChange={(e) => set({ currency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-pine">Who may read your answers</h2>
        <label className="flex gap-3">
          <input
            type="checkbox"
            className="mt-1.5 h-5 w-5 accent-pine"
            checked={draft.consent_ai}
            onChange={(e) => set({ consent_ai: e.target.checked })}
          />
          <span>
            My AI partner may read my answers to help me.
            <span className="block text-sm text-stone">
              If you switch this off, your AI partner stops helping and stops making notes.
            </span>
          </span>
        </label>
        <label className="flex gap-3">
          <input
            type="checkbox"
            className="mt-1.5 h-5 w-5 accent-pine"
            checked={draft.consent_founder_access}
            onChange={(e) => set({ consent_founder_access: e.target.checked })}
          />
          <span>
            Mwata may read my answers and my AI summary to guide me.
            <span className="block text-sm text-stone">You can change this at any time.</span>
          </span>
        </label>
      </section>

      <div className="flex flex-col items-center gap-2">
        <button className="btn btn-primary" disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Save"}
        </button>
        {state === "saved" && <span className="text-success">Saved.</span>}
        {state === "error" && (
          <span role="alert" className="text-ochre">
            This was not saved. Please check your internet and try again.
          </span>
        )}
      </div>

      <p className="text-sm text-stone">
        Want to see or delete what your AI partner knows, or delete everything?{" "}
        <Link href="/me" className="underline">
          What my AI partner knows
        </Link>
        .
      </p>
    </form>
  );
}

export default function SettingsPage() {
  const { profile } = useApp();
  return (
    <Shell quiet>
      <RequireUser>
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 sm:p-8">
          <h1 className="mb-6 text-2xl font-bold text-pine">My settings</h1>
          {profile && <SettingsForm profile={profile} />}
          {/* Outside the form: it takes effect as you pick it, with no Save. */}
          <div className="mt-8 border-t border-line pt-8">
            <ThemeChoice />
          </div>
          <div className="mt-8 border-t border-line pt-8">
            <h2 className="text-xl font-semibold text-pine">Help</h2>
            <p className="mt-1 text-sm text-stone">
              A short question about a step, or something in the app that will not work? Ask me, and I answer by email.
            </p>
            <p className="mt-3 flex justify-center">
              <Link href="/help" className="btn btn-ghost">
                Ask a question
              </Link>
            </p>
          </div>
        </div>
      </RequireUser>
    </Shell>
  );
}
