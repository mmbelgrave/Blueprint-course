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
import { WithdrawCard, WithdrawForm, type Done, type Purchase } from "@/components/withdraw-card";

type Mine = { signedIn: boolean; purchase: Purchase | null; already?: Done | null };

export default function WithdrawPage() {
  const [mine, setMine] = useState<Mine | null>(null);

  useEffect(() => {
    let gone = false;
    fetch("/api/withdraw", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!gone && data) setMine(data);
      })
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, []);

  return (
    <Shell>
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-pine">Withdraw from contract</h1>
        <p className="mt-2 text-stone">
          You may withdraw within 14 days of buying, without giving a reason, and we refund the full price to the
          payment method you used. Beyond those 14 days our own 30-day guarantee applies, and that is a full refund
          too.
        </p>

        {mine?.signedIn && (mine.purchase || mine.already) ? (
          <div className="mt-6">
            <WithdrawCard purchase={mine.purchase} already={mine.already ?? null} />
          </div>
        ) : (
          <div className="mt-6">
            <WithdrawForm />
          </div>
        )}

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
