"use client";
// "My settings": change what was chosen on the consent screen (which promised
// "you can change this later"), plus first name and currency.
import Link from "next/link";
import { useState } from "react";
import { AccountWithdraw } from "@/components/account-withdraw";
import { ConsentSettings } from "@/components/consent-settings";
import { PartnerSeat } from "@/components/partner-seat";
import { RequireUser, Shell } from "@/components/Shell";
import { SignOutCard } from "@/components/sign-out-card";
import { isFree } from "@/lib/access-app";
import { ThemeChoice } from "@/components/theme-choice";
import { useApp } from "@/lib/app-state";
import type { Profile } from "@/lib/backend";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AUD", "CAD", "ZAR", "BRL"];

function SettingsForm({ profile }: { profile: Profile }) {
  const { entitlements, saveProfile } = useApp();
  // Nothing here that a free account does not have: no money questions, no AI
  // to give permission to, nobody reading along.
  const free = isFree(entitlements);
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
        {!free && (
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
        )}
      </section>

      {/* Each tick saves itself, with the date and the words that were read. */}
      {!free && <ConsentSettings />}

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
        {free ? (
          <>
            Want to delete everything you have written here?{" "}
            <Link href="/me" className="underline">
              Delete my account
            </Link>
            .
          </>
        ) : (
          <>
            Want to see or delete what your AI partner knows, or delete everything?{" "}
            <Link href="/me" className="underline">
              What my AI partner knows
            </Link>
            .
          </>
        )}
      </p>
    </form>
  );
}

export default function SettingsPage() {
  const { profile } = useApp();
  return (
    <Shell>
      <RequireUser>
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 sm:p-8">
          <h1 className="mb-6 text-2xl font-bold text-pine">My settings</h1>
          {profile && <SettingsForm profile={profile} />}
          {/* Outside the form: it takes effect as you pick it, with no Save. */}
          <div className="mt-8 border-t border-line pt-8">
            <ThemeChoice />
          </div>
          {/* The privacy page promises a copy of what is stored about you (§6.6).
              This hands it over without anyone having to ask for it. */}
          <div className="mt-8 border-t border-line pt-8">
            <h2 className="text-xl font-semibold text-pine">My answers</h2>
            <p className="mt-1 text-sm text-stone">
              Everything you have written, to read, to print, or to keep as a file. Your answers are your own.
            </p>
            <p className="mt-3 flex flex-wrap justify-center gap-2">
              <Link href="/answers" className="btn btn-ghost">
                Everything I wrote
              </Link>
              <a href="/api/account/export" className="btn btn-ghost">
                Download the file
              </a>
            </p>
          </div>

          {/* The seat that comes with a purchase (6.8). It draws nothing at
              all until there is one to offer or one in use. */}
          <PartnerSeat />

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
          {/* Terms 9: the withdrawal has to be reachable without hunting for
              it. A free account sees nothing here. */}
          <AccountWithdraw />

          {/* Spec 6.9 puts signing out in Settings. The header has it too, but
              the header is hidden on a phone, so this is the only way out
              there, and the way two people swap accounts on one laptop. */}
          <SignOutCard />

          {/* The two pages the app has to keep within reach. They used to sit
              in the footer of every page; this is where somebody looks for
              them, and the footer is quieter for it. */}
          <p className="mt-8 text-center text-sm text-stone">
            <Link href="/privacy" className="underline">
              Privacy
            </Link>
            <span className="mx-2">·</span>
            <a href="https://maderealblueprint.com/terms.html" className="underline">
              Terms
            </a>
          </p>
        </div>
      </RequireUser>
    </Shell>
  );
}
