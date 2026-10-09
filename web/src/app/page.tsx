"use client";
// The door: what someone sees before they sign in. This is app text, not
// workbook text — the step welcome that used to stand here was written for a
// person already inside the workbook.
import Link from "next/link";
import { Mark } from "@/components/brand";
import { Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { journey, PRODUCT } from "@/lib/content";

export default function Welcome() {
  const { user } = useApp();
  // Steps open to people. A step can be written and still be closed (Step 2
  // waits for its final workbook), so this counts the open ones, not the ready ones.
  const live = journey.steps.filter((s) => s.in_app).length;

  return (
    <Shell>
      <section className="py-6">
        <p className="flex items-center gap-2.5 text-sm font-semibold tracking-wide text-ochre">
          <Mark size={26} />
          {PRODUCT.brand}
        </p>

        <h1 className="mt-4 text-4xl text-pine sm:text-5xl">Welcome. You already took the first step.</h1>

        <div className="mt-6 max-w-2xl space-y-4 text-lg">
          <p>
            You decided to look at your life properly, and to do something with what you find. That is the part most
            people keep putting off.
          </p>
          <p>
            This app is the workbook, with room to write and an AI partner beside you that remembers what you wrote and
            asks about it later.
          </p>
          <p>
            Work at your own pace. Your answers save themselves, so you can stop in the middle of a sentence and come
            back next week.
          </p>
        </div>

        <div className="mt-8">
          <Link href={user ? "/modules" : "/signin"} className="btn btn-primary text-lg">
            {user ? "Continue" : "Sign in"}
          </Link>
          {!user && (
            <p className="mt-2 text-stone">
              First time here? Type your email and we send you a code. No password to remember.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10 max-w-2xl border-t border-line pt-6 text-stone">
        <p>
          {PRODUCT.name} · {PRODUCT.edition}. The Blueprint has {journey.steps.length} steps in three phases: choose
          it, build it, live it. {live === 1 ? "The first one is open now" : `The first ${live === 2 ? "two" : live} are open now`}; the
          rest follow.
        </p>
        <p className="mt-3">
          Everything you write stays yours. You can read it, correct it, or delete all of it at any time.{" "}
          <Link href="/privacy" className="text-pine underline">
            Your privacy
          </Link>
          .
        </p>
      </section>
    </Shell>
  );
}
