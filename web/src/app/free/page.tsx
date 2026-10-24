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
import { Suspense, useEffect } from "react";
import { Shell } from "@/components/Shell";
import { SignInForm } from "@/components/sign-in-form";
import { useApp } from "@/lib/app-state";
import { cleanSource, rememberSignup } from "@/lib/signup-source";

/**
 * What a free account opens, in the person's words rather than in page ids.
 *
 * Only what is there today. The third line used to promise the first video of
 * Step 1; the part videos are not recorded yet, so it said something the
 * account could not do (external review, 23 October).
 */
const WHAT_YOU_GET = [
  "The Introduction: a short welcome video, so you know what you are walking into.",
  "The Ordinary Tuesday: one normal day in the life you want, written out in enough detail to test it.",
  "Your own account, so what you write is still there when you come back.",
];

function FreeSignUp() {
  const from = cleanSource(useSearchParams().get("from"));

  // Where the link was shared waits in this browser while they fetch the code.
  // The updates tick is part of the form itself (lawyer, 24 October).
  useEffect(() => {
    rememberSignup({ from });
  }, [from]);

  return <SignInForm goTo="/modules" sendLabel="Send me a code" />;
}

export default function FreePage() {
  const { user } = useApp();

  return (
    <Shell>
      <section className="mx-auto max-w-md space-y-6">
        <header className="text-center">
          <h1 className="text-3xl text-pine">Try it for free</h1>
          {/* No claim about what "most people" find useful: nobody has
              measured that. What the exercise does, instead (external
              review, 23 October). */}
          <p className="mt-2 text-stone">
            Make a free account and write one exercise from Step 1: an ordinary day in the life you want, hour by hour.
            It works the same way whether you are thinking of moving abroad or of changing something where you live.
            Nothing to pay, and nothing that runs out.
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
