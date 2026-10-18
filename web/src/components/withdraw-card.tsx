"use client";
/**
 * "Withdraw from contract here" (Terms §9).
 *
 * The same two steps wherever it appears: the button, then the confirmation.
 * Two steps because one press should not end somebody's purchase, and because
 * the law expects a deliberate act rather than a slip.
 *
 * It is deliberately plain about the consequence before the second press, and
 * about the date afterwards, since that date is what the email will repeat.
 */
import { useState } from "react";

export type Purchase = {
  orderId: string | null;
  product: string;
  amountCents: number | null;
  currency: string | null;
  boughtAt: string;
  window: "withdrawal" | "guarantee" | "closed";
};

export type Done = { requestedAt: string; accessEndsAt: string; emailed?: boolean; already?: boolean };

const day = (at: string) => new Date(at).toLocaleDateString("en-GB", { dateStyle: "long" });
const moment = (at: string) => new Date(at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });
export const price = (cents: number | null, currency: string | null) =>
  cents === null ? "the price you paid" : `${currency === "USD" ? "$" : "€"}${(cents / 100).toFixed(2)}`;

export function WithdrawCard({
  purchase,
  why,
  already,
  /** The public page sends the order and the address; Settings sends nothing. */
  credentials,
}: {
  purchase: Purchase | null;
  why?: string | null;
  already?: Done | null;
  credentials?: { orderId: string; email: string };
}) {
  const [step, setStep] = useState<"start" | "confirm">("start");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(already ?? null);
  const [problem, setProblem] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(credentials ?? {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setProblem(data.error ?? "That did not work. Please email info@maderealblueprint.com.");
        return;
      }
      setDone(data);
    } catch {
      setProblem("That did not work. Please check your internet, or email info@maderealblueprint.com.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-success-soft p-5">
        <h3 className="text-lg font-semibold text-success">Your withdrawal is recorded</h3>
        <p className="mt-2 text-sm">
          {done.already ? "You had already asked, on " : "We have your withdrawal, dated "}
          <strong>{moment(done.requestedAt)}</strong>. We refund the full price to the payment method you used, within
          14 days. There is nothing else for you to do.
        </p>
        <p className="mt-2 text-sm">
          Your access stays open until <strong>{day(done.accessEndsAt)}</strong>, three working days from the request,
          in case you change your mind. If you do, reply to the email we just sent.
        </p>
        {done.emailed === false && (
          <p className="mt-2 text-sm text-ochre">
            The confirmation email could not be sent, but your request is recorded. Mwata can see it.
          </p>
        )}
      </div>
    );
  }

  if (!purchase) {
    return (
      <p className="text-sm text-stone">
        {why ?? "We cannot find a purchase on this account. If you bought it with another address, use the order number instead."}
      </p>
    );
  }

  if (purchase.window === "closed" || why) {
    return <p className="rounded-lg bg-ochre-soft p-3 text-sm">{why}</p>;
  }

  return (
    <div>
      <p className="text-sm text-stone">
        {purchase.product === "phase1" ? "Phase 1" : purchase.product}, bought on {day(purchase.boughtAt)} for{" "}
        {price(purchase.amountCents, purchase.currency)}
        {purchase.orderId ? `, order ${purchase.orderId}` : ""}.
      </p>

      {purchase.window === "guarantee" && (
        <p className="mt-2 text-sm text-stone">
          The 14 days have passed, so this is the 30-day guarantee rather than the legal right to withdraw. You still
          get the full price back.
        </p>
      )}

      {step === "start" ? (
        <p className="mt-3">
          <button type="button" className="btn btn-ghost" onClick={() => setStep("confirm")}>
            Withdraw from contract here
          </button>
        </p>
      ) : (
        <div className="mt-3 rounded-lg bg-ochre-soft p-4">
          <p className="text-sm">
            <strong>Your access ends and you get the full price back.</strong> Access stays open for three working days
            so you can change your mind, and your answers stay until then. We refund{" "}
            {price(purchase.amountCents, purchase.currency)} to the payment method you used, within 14 days.
          </p>
          <p className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={confirm}>
              {busy ? "One moment…" : "Confirm withdrawal"}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setStep("start")}>
              Keep my course
            </button>
          </p>
        </div>
      )}

      {problem && <p className="mt-3 rounded-lg bg-ochre-soft p-3 text-sm">{problem}</p>}
    </div>
  );
}
