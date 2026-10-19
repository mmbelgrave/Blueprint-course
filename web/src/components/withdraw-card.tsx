"use client";
/**
 * "Withdraw from contract here" (Terms §9, legal review of 18 October part 2).
 *
 * Two shapes, one confirmation. Somebody signed in sees their purchase and
 * presses twice, because one press should not end a course by accident and the
 * law expects a deliberate act. Somebody who cannot sign in fills in three
 * fields, of which only the email address is required, and presses once.
 *
 * The form never refuses. A missing or mistyped order number is not a reason
 * to turn a withdrawal away, so the button is live as soon as there is an
 * email address in the box, and the matching happens afterwards.
 */
import { useState } from "react";

export type Purchase = {
  orderId: string | null;
  product: string;
  amountCents: number | null;
  currency: string | null;
  boughtAt: string;
  window: "withdrawal" | "guarantee" | "closed";
  refunded?: boolean;
};

export type Done = {
  requestedAt: string;
  timeZone?: string | null;
  refundDeadline?: string;
  accessEndsAt?: string | null;
  emailed?: boolean;
  already?: boolean;
  promise?: string;
};

const day = (at: string) => new Date(at).toLocaleDateString("en-GB", { dateStyle: "long" });
const moment = (at: string) => new Date(at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });
const myZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

export const price = (cents: number | null, currency: string | null) =>
  cents === null ? "the price you paid" : `${currency === "USD" ? "$" : "€"}${(cents / 100).toFixed(2)}`;

async function send(body: Record<string, string | null>): Promise<{ done?: Done; problem?: string }> {
  try {
    const res = await fetch("/api/withdraw", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, timeZone: myZone() }),
    });
    const data = await res.json();
    if (!res.ok) return { problem: data.error ?? "That did not work. Please email info@maderealblueprint.com." };
    return { done: data as Done };
  } catch {
    return { problem: "That did not work. Please check your internet, or email info@maderealblueprint.com." };
  }
}

/**
 * What the person sees afterwards, which is also what the email repeats.
 *
 * On the public page this says nothing about whether the address matched a
 * purchase. That belongs in the email, which only the owner of the address
 * can read.
 */
export function Confirmation({ done, email }: { done: Done; email?: string }) {
  const zone = done.timeZone ? ` (${done.timeZone})` : "";
  return (
    <div className="rounded-2xl bg-success-soft p-5">
      <h3 className="text-lg font-semibold text-success">Your withdrawal is recorded</h3>
      <p className="mt-2 text-sm">
        {done.already ? "You had already asked, on " : "We have your withdrawal, dated "}
        <strong>
          {moment(done.requestedAt)}
          {zone}
        </strong>
        .{" "}
        {done.promise ??
          "We refund the full price you paid, to the payment method you used, within 14 days. There is nothing else for you to do."}
      </p>
      {done.accessEndsAt && (
        <p className="mt-2 text-sm">
          Your access stays open until <strong>{day(done.accessEndsAt)}</strong>, three days from the request, in case
          you change your mind. Before then, download your workbook in My settings so you keep what you have written.
        </p>
      )}
      <p className="mt-2 text-sm">
        We have sent the confirmation {email ? <>to {email}</> : "to your email address"}. Reply to it if you change
        your mind, or if anything in it is wrong.
      </p>
      {done.emailed === false && (
        <p className="mt-2 text-sm text-ochre">
          That email could not be sent, but your withdrawal is recorded and Mwata can see it.
        </p>
      )}
    </div>
  );
}

/** The signed-in version: their own purchase, and two presses. */
export function WithdrawCard({ purchase, already }: { purchase: Purchase | null; already?: Done | null }) {
  const [step, setStep] = useState<"start" | "confirm">("start");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(already ?? null);
  const [problem, setProblem] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setProblem(null);
    const { done: ok, problem: bad } = await send({});
    if (ok) setDone(ok);
    if (bad) setProblem(bad);
    setBusy(false);
  }

  if (done) return <Confirmation done={done} />;

  if (!purchase) {
    return (
      <p className="text-sm text-stone">
        We cannot find a purchase on this account. If you bought it with another address, use the withdrawal page and
        give that address.
      </p>
    );
  }

  if (purchase.refunded) {
    return <p className="rounded-lg bg-sand p-3 text-sm text-stone">This purchase has already been refunded.</p>;
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
      {purchase.window === "closed" && (
        <p className="mt-2 text-sm text-stone">
          The 14 days and the 30-day guarantee have both passed. You can still send this, and we will look at it and
          reply by email.
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
            <strong>Your access ends and you get the full price back.</strong> Access stays open for three days so you
            can change your mind, and your answers stay until then. We refund{" "}
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

/** The public version: three fields, one press, no sign-in. */
export function WithdrawForm() {
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  if (done) return <Confirmation done={done} email={email.trim()} />;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setProblem(null);
        const { done: ok, problem: bad } = await send({
          email: email.trim(),
          order: order.trim() || null,
          name: name.trim() || null,
        });
        if (ok) setDone(ok);
        if (bad) setProblem(bad);
        setBusy(false);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          The email address you paid with
          <input
            type="email"
            inputMode="email"
            required
            autoComplete="email"
            className="field-input mt-1 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label className="text-sm">
          Order number <span className="text-stone">(if you have it)</span>
          <input
            className="field-input mt-1 w-full"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            placeholder="from your receipt"
          />
        </label>
        <label className="text-sm">
          Your name <span className="text-stone">(if you want)</span>
          <input
            className="field-input mt-1 w-full"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </div>

      <p className="mt-4">
        <button className="btn btn-primary" disabled={busy || !email.trim()}>
          {busy ? "One moment…" : "Confirm withdrawal"}
        </button>
      </p>
      <p className="mt-2 text-sm text-stone">
        You do not have to give a reason. We send you a confirmation by email, with the date and time.
      </p>

      {problem && <p className="mt-3 rounded-lg bg-ochre-soft p-3 text-sm">{problem}</p>}
    </form>
  );
}
