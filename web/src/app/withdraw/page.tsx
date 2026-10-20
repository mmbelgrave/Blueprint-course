"use client";
/*
 * "Withdraw from contract here", for anybody (Terms §9).
 *
 * This page asks for no sign-in on purpose. The person most likely to want
 * their money back is the one who cannot get in, and a withdrawal that depends
 * on signing in is not really available. One field is required, the email
 * address, because that is how we answer and how we find the purchase. The
 * order number helps and is optional; a wrong one changes nothing.
 *
 * The page stays here after anybody's 14 days have passed. A date is not a
 * reason to take the form away.
 *
 * Somebody already signed in gets their purchase shown straight away, so they
 * do not have to go and find a receipt.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { WithdrawCard, WithdrawForm, type Done, type Purchase } from "@/components/withdraw-card";

type Mine = { signedIn: boolean; purchase: Purchase | null; already?: Done | null };

export default function WithdrawPage() {
  const [mine, setMine] = useState<Mine | null>(null);
  /*
   * Which of the two shapes belongs here is known before the purchase is:
   * the app has already asked who is signed in. Drawing the public form
   * while that was still in the post, and swapping it a second later, made
   * the page look as though it had changed its mind.
   */
  const { user, loading } = useApp();

  useEffect(() => {
    let gone = false;
    /* Anything other than an answer we understand means the form, not a page
       that waits for ever. */
    const nobody: Mine = { signedIn: false, purchase: null };
    fetch("/api/withdraw", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : nobody))
      .then((data) => {
        if (!gone) setMine(data ?? nobody);
      })
      .catch(() => {
        if (!gone) setMine(nobody);
      });
    return () => {
      gone = true;
    };
  }, []);

  return (
    <Shell>
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-pine">Withdraw from contract</h1>
        {/* The lawyer's intro, word for word (D1), and then the guarantee, which
            the published terms already promise. */}
        <p className="mt-2 text-stone">
          You can withdraw from your purchase of Phase 1 of The Made Real Blueprint within 14 days of buying, without
          giving a reason. You do not need to sign in.
        </p>
        <p className="mt-2 text-stone">
          We refund the full price to the payment method you used. Beyond those 14 days our own 30-day guarantee
          applies: email <span className="text-pine">info@maderealblueprint.com</span> with your order number, and
          tell us in a line or two what did not work for you. That is our own promise rather than a legal right, and
          the reason is what lets us improve the course; the full refund does not depend on it.
        </p>

        <div className="mt-6">
          {loading || (user && !mine) ? (
            <p className="text-sm text-stone">One moment…</p>
          ) : mine?.signedIn && (mine.purchase || mine.already) ? (
            <WithdrawCard purchase={mine.purchase} already={mine.already ?? null} />
          ) : (
            <WithdrawForm />
          )}
        </div>

        <p className="mt-8 border-t border-line pt-6 text-sm text-stone">
          You can also email <span className="text-pine">info@maderealblueprint.com</span>, or use the model
          withdrawal form in the{" "}
          <a href="https://maderealblueprint.com/terms.html" className="text-pine underline">
            terms
          </a>
          . Any of these is enough: the date of your message is the date of your withdrawal.
        </p>
        <p className="mt-3 text-sm">
          <Link href="/" className="text-pine underline">
            Back to the app
          </Link>
        </p>
      </div>
    </Shell>
  );
}
