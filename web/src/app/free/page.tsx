"use client";
/*
 * The link to share (spec §6.2): app.maderealblueprint.com/free
 *
 * Three lines on what you get, then the same sign-in as everywhere else. No
 * payment, no card, no trial that quietly ends. What a free account opens is
 * set in access.json, never here, so changing it is one line of content and
 * not a change to this page.
 *
 * The link can carry where it was shared: /free?from=instagram. That word, and
 * the tick about updates, wait in this browser until the consent page writes
 * them to the profile.
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { SignInForm } from "@/components/sign-in-form";
import { useApp } from "@/lib/app-state";
import { cleanSource, rememberSignup } from "@/lib/signup-source";

/** What a free account opens, in the person's words rather than in page ids. */
const WHAT_YOU_GET = [
  "The Introduction: the welcome video, so you know what you are walking into.",
  "The Ordinary Tuesday — the exercise most people say told them the most.",
  "The first video of Step 1, so you know who you would be working with.",
];

function FreeSignUp() {
  const from = cleanSource(useSearchParams().get("from"));
  const [updates, setUpdates] = useState(false);

  // Kept together, so whichever of the two changes last is the one that counts.
  useEffect(() => {
    rememberSignup({ from, wants_updates: updates });
  }, [from, updates]);

  return (
    <SignInForm
      goTo="/modules"
      sendLabel="Send me a code"
      beforeButton={
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0"
            checked={updates}
            onChange={(e) => setUpdates(e.target.checked)}
          />
          <span className="text-sm text-stone">
            Send me an occasional update when something new is ready.{" "}
            <span className="block">You can stop this at any time, and signing up does not subscribe you.</span>
          </span>
        </label>
      }
    />
  );
}

export default function FreePage() {
  const { user } = useApp();

  return (
    <Shell>
      <section className="mx-auto max-w-md space-y-6">
        <header className="text-center">
          <h1 className="text-3xl text-pine">Try it for free</h1>
          <p className="mt-2 text-stone">
            Make a free account and start with the part most people find the most useful. Nothing to pay, and nothing
            that runs out.
          </p>
        </header>

        <ul className="space-y-2 rounded-2xl bg-white p-5">
          {WHAT_YOU_GET.map((line) => (
            <li key={line} className="flex items-start gap-3">
              <span aria-hidden className="mt-0.5 font-semibold text-ochre">
                ✓
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        {user ? (
          <div className="space-y-3 rounded-2xl bg-white p-5 text-center">
            <p>You are already signed in, so this is yours already.</p>
            <Link href="/modules" className="btn btn-primary">
              To the modules
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6">
            <h2 className="mb-4 text-xl text-pine">Start now</h2>
            <Suspense>
              <FreeSignUp />
            </Suspense>
          </div>
        )}

        <p className="text-center text-sm text-stone">
          Already have an account?{" "}
          <Link href="/signin" className="underline">
            Sign in
          </Link>
        </p>
      </section>
    </Shell>
  );
}
