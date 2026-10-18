"use client";
/*
 * "Withdraw from contract here", for anybody (Terms §9).
 *
 * This page asks for no sign-in on purpose. The person most likely to want
 * their money back is the one who cannot get in, and a withdrawal that depends
 * on signing in is not really available. The order number and the address that
 * paid are on the Lemon Squeezy receipt, and both have to match before
 * anything happens.
 *
 * Somebody already signed in gets their purchase shown straight away, so they
 * do not have to go and find a receipt.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { WithdrawCard, type Done, type Purchase } from "@/components/withdraw-card";

type Mine = { signedIn: boolean; purchase: Purchase | null; may?: boolean; why?: string | null; already?: Done | null };

export default function WithdrawPage() {
  const [mine, setMine] = useState<Mine | null>(null);
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [asked, setAsked] = useState(false);

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
            <WithdrawCard purchase={mine.purchase} why={mine.why} already={mine.already ?? null} />
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-sm text-stone">
              Your order number and the email address you paid with are both on your receipt from Lemon Squeezy.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Order number
                <input
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="from your receipt"
                />
              </label>
              <label className="text-sm">
                The email you paid with
                <input
                  type="email"
                  inputMode="email"
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
            </div>

            {asked ? (
              <div className="mt-4">
                <WithdrawCard
                  purchase={{
                    orderId: orderId.trim(),
                    product: "phase1",
                    amountCents: null,
                    currency: null,
                    boughtAt: new Date().toISOString(),
                    window: "withdrawal",
                  }}
                  credentials={{ orderId: orderId.trim(), email: email.trim() }}
                />
              </div>
            ) : (
              <p className="mt-4">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={!orderId.trim() || !email.trim()}
                  onClick={() => setAsked(true)}
                >
                  Withdraw from contract here
                </button>
              </p>
            )}
          </div>
        )}

        <p className="mt-8 border-t border-line pt-6 text-sm text-stone">
          You can also email <span className="text-pine">info@maderealblueprint.com</span> with your order number, or
          use the model withdrawal form in the{" "}
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
