"use client";
// Admin overview (brief 4.7). Only the admin gets data: the server checks.
import { useEffect, useState } from "react";
import { RequireUser, Shell } from "@/components/Shell";
import { products } from "@/lib/access-app";

type Participant = {
  id: string;
  email: string;
  name: string;
  started: string;
  lastActivity: string | null;
  consentAi: boolean;
  cameFrom: string;
  wantsUpdates: boolean;
  free: boolean;
  seatWith?: string;
  progress: {
    step: number;
    title: string;
    parts: { label: string; optional: boolean; done: number; total: number; complete: boolean }[];
  }[];
  feedback: { part: string; rating: number | null; comment: string; date: string }[];
  owns: {
    id: number;
    product: string;
    status: "active" | "refunded" | "revoked";
    source: "lemonsqueezy" | "granted";
    orderId: string;
    amount: string;
    testMode: boolean;
    date: string;
  }[];
  questions: {
    topic: string;
    page: string;
    question: string;
    date: string;
  }[];
  usage: {
    chatMessages: number;
    drafts: number;
    noteUpdates: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    costUsd: number;
  };
};

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");
const n = (x: number) => x.toLocaleString();
const usd = (x: number) => `$${x.toFixed(2)}`;

/** What this person owns, and giving or ending it by hand (spec 6.1). */
function Owns({ p }: { p: Participant }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const live = p.owns.filter((o) => o.status === "active");

  const send = async (url: string, body: unknown) => {
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch(url, { method: body && "id" in (body as object) ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) setProblem(((await res.json()) as { error?: string }).error ?? "That did not work.");
      else location.reload();
    } catch {
      setProblem("That did not work. Check your internet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-line pt-3">
      <h3 className="text-sm font-semibold">Owns</h3>
      {p.owns.length === 0 ? (
        <p className="text-sm text-stone">Nothing yet.</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm">
          {p.owns.map((o) => (
            <li key={o.id}>
              <span className="font-medium">{o.product}</span>
              {o.status !== "active" && <span className="text-stone"> — {o.status}</span>}
              <span className="text-stone">
                {" "}
                · {o.source === "granted" ? "given by hand" : `order ${o.orderId || "?"}`}
                {o.amount ? ` · ${o.amount}` : ""}
                {o.testMode ? " · test" : ""} · {day(o.date)}
              </span>
              {o.status === "active" && (
                <button
                  className="ml-2 text-pine underline"
                  disabled={busy}
                  onClick={() => send("/api/admin/entitlements", { id: o.id, status: "revoked" })}
                >
                  End it
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-stone">Give:</span>
        {products
          .filter((pr) => !live.some((o) => o.product === pr.id))
          .map((pr) => (
            <button
              key={pr.id}
              className="btn btn-ghost py-1 text-sm"
              disabled={busy}
              onClick={() => send("/api/admin/entitlements", { userId: p.id, product: pr.id })}
            >
              {pr.name}
            </button>
          ))}
      </p>
      {problem && (
        <p role="alert" className="text-sm text-ochre">
          {problem}
        </p>
      )}
    </div>
  );
}

function ParticipantCard({ p }: { p: Participant }) {
  return (
    <li className="space-y-4 rounded-2xl bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-pine">{p.name || "(no name yet)"}</h2>
          <p className="text-sm text-stone">{p.email}</p>
        </div>
        <p className="text-sm text-stone">
          Started {day(p.started)} · Last active {day(p.lastActivity)}
          <span className="block">
            {p.free ? "Free account" : p.seatWith ? `On a seat with ${p.seatWith}` : "Has the course"} · came from{" "}
            {p.cameFrom}
            {p.wantsUpdates ? " · wants updates" : ""}
          </span>
        </p>
      </div>

      <div className="space-y-2">
        {p.progress.map((s) => (
          <div key={s.step}>
            <p className="text-sm font-semibold">
              Step {s.step} · {s.title}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {s.parts.map((part) => (
                <span
                  key={part.label}
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    part.complete && part.total ? "bg-success-soft text-success" : part.done ? "bg-sage" : "bg-sand text-stone"
                  }`}
                  title={part.optional ? "optional" : undefined}
                >
                  {part.label} {part.done}/{part.total}
                  {part.optional ? "*" : ""}
                </span>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-stone">* optional part</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">AI use</h3>
          <p className="text-sm">
            {n(p.usage.chatMessages)} messages · {n(p.usage.drafts)} drafts · {n(p.usage.noteUpdates)} note updates
          </p>
          <p className="text-sm text-stone">
            Tokens: {n(p.usage.inputTokens)} in · {n(p.usage.outputTokens)} out · {n(p.usage.cacheReadTokens)} from cache
          </p>
          <p className="text-sm">
            Estimated cost: <strong>{usd(p.usage.costUsd)}</strong>
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Feedback</h3>
          {p.feedback.length === 0 ? (
            <p className="text-sm text-stone">None yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {p.feedback.map((f, i) => (
                <li key={i}>
                  <span className="font-medium">{f.part}:</span>{" "}
                  <span className="text-ochre">{"★".repeat(f.rating ?? 0)}</span>
                  <span className="text-line">{"★".repeat(5 - (f.rating ?? 0))}</span>
                  {f.comment && <span className="text-stone"> — {f.comment}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {p.questions.length > 0 && (
        <div className="border-t border-line pt-3">
          <h3 className="text-sm font-semibold">Questions</h3>
          <ul className="mt-1 space-y-2 text-sm">
            {p.questions.map((q, i) => (
              <li key={i} className="rounded-lg bg-sand p-3">
                <p className="text-stone">
                  {day(q.date)} · {q.topic}
                  {q.page ? ` · ${q.page}` : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{q.question}</p>
                <p className="mt-1">
                  <a className="text-pine underline" href={`mailto:${p.email}`}>
                    Reply by email
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Owns p={p} />

      <div className="border-t border-line pt-3 text-sm">
        {/* Nobody's answers are shown here. Progress and feedback only
            (Mwata, 20 October: the consent to read answers is gone, and so
            is the page it opened). */}
        <p className="text-stone">Progress and feedback only. Answers belong to the person who wrote them.</p>
        {!p.consentAi && <p className="mt-1 text-stone">AI partner switched off by this person.</p>}
      </div>
    </li>
  );
}

function UpdateList({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState(false);
  if (emails.length === 0) return null;
  return (
    <div className="mt-4 rounded-2xl bg-white p-4">
      <p className="font-semibold text-pine">
        {emails.length} {emails.length === 1 ? "person wants" : "people want"} an occasional update
      </p>
      <p className="mt-1 text-sm text-stone">
        Nothing is sent from the app. Copy the addresses when you have something to tell them.
      </p>
      <p className="mt-3">
        <button
          className="btn btn-ghost py-1.5 text-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(emails.join(", "));
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "✓ Copied" : "Copy the addresses"}
        </button>
      </p>
    </div>
  );
}

/** One message from Lemon Squeezy, and what the app did with it (§6.1). */
type WebhookEvent = {
  event: string;
  order_id: string | null;
  email: string | null;
  test_mode: boolean;
  outcome: "opened" | "closed" | "ignored" | "failed";
  detail: string | null;
  created_at: string;
};

function Webhooks({ events }: { events: WebhookEvent[] }) {
  const trouble = events.filter((e) => e.outcome === "failed");
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-pine">Orders from Lemon Squeezy</h2>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-stone">
          Nothing has arrived yet. Until the first one does, this is the only sign of whether the webhook is wired up:
          an order that never reaches the app opens nothing, and nobody is told.
        </p>
      ) : (
        <>
          {trouble.length > 0 && (
            <p className="mt-2 rounded-lg bg-ochre-soft p-3 text-sm">
              <strong>{trouble.length === 1 ? "One order" : `${trouble.length} orders`} did not go through.</strong> Give
              the person access by hand below, then look at why.
            </p>
          )}
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-stone">
                <th className="py-1 pr-3 font-medium">When</th>
                <th className="py-1 pr-3 font-medium">Who</th>
                <th className="py-1 pr-3 font-medium">What happened</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-b border-line/60 align-top">
                  <td className="py-1 pr-3 whitespace-nowrap text-stone">{day(e.created_at)}</td>
                  <td className="py-1 pr-3">
                    {e.email ?? "—"}
                    {e.test_mode && <span className="ml-1 text-xs text-stone">(test)</span>}
                  </td>
                  <td className="py-1 pr-3">
                    <span
                      className={
                        e.outcome === "failed"
                          ? "font-semibold text-error"
                          : e.outcome === "opened"
                            ? "font-semibold text-success"
                            : "text-stone"
                      }
                    >
                      {{ opened: "Opened", closed: "Refunded", ignored: "Nothing to do", failed: "Failed" }[e.outcome]}
                    </span>
                    {e.detail && <span className="text-stone"> — {e.detail}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

type WithdrawalRow = {
  email: string;
  name: string | null;
  order_entered: string | null;
  matched_order_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  requested_at: string;
  refund_deadline: string;
  access_ends_at: string | null;
  status: string;
  source: string;
};

/**
 * Withdrawals waiting for their money (Terms 9).
 *
 * The app ends the access on its own; the refund is pressed by hand in Lemon
 * Squeezy. So this list is the one thing standing between a buyer and their
 * money, and it sits above the webhooks for that reason.
 */
function Withdrawals({ rows }: { rows: WithdrawalRow[] }) {
  if (rows.length === 0) return null;
  const open = rows.filter((r) => r.status === "received");
  return (
    <section className="mt-8 rounded-2xl bg-white p-5">
      <h2 className="text-lg font-semibold text-pine">
        Withdrawals{open.length > 0 ? ` · ${open.length} to refund` : ""}
      </h2>
      {open.length > 0 && (
        <p className="mt-1 rounded-lg bg-ochre-soft p-3 text-sm">
          Refund these in full in Lemon Squeezy. The app has already told the buyer and set the date their access ends.
        </p>
      )}
      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-stone">
            <th className="py-1 pr-3 font-medium">Asked</th>
            <th className="py-1 pr-3 font-medium">Who</th>
            <th className="py-1 pr-3 font-medium">Order</th>
            <th className="py-1 pr-3 font-medium">Refund</th>
            <th className="py-1 pr-3 font-medium">Money due by</th>
            <th className="py-1 pr-3 font-medium">Access ends</th>
            <th className="py-1 pr-3 font-medium">State</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.email}-${r.requested_at}`} className="border-b border-line/60 align-top">
              <td className="py-1 pr-3 whitespace-nowrap text-stone">{day(r.requested_at)}</td>
              <td className="py-1 pr-3">
                {r.email}
                {r.name ? <span className="block text-stone">{r.name}</span> : null}
              </td>
              <td className="py-1 pr-3">
                {r.matched_order_id ?? <span className="font-semibold text-ochre">match by hand</span>}
                {r.order_entered && r.order_entered !== r.matched_order_id ? (
                  <span className="block text-stone">typed: {r.order_entered}</span>
                ) : null}
              </td>
              <td className="py-1 pr-3 whitespace-nowrap">
                {r.amount_cents === null ? "—" : `${r.currency === "USD" ? "$" : "€"}${(r.amount_cents / 100).toFixed(2)}`}
              </td>
              <td className="py-1 pr-3 whitespace-nowrap text-stone">{day(r.refund_deadline)}</td>
              <td className="py-1 pr-3 whitespace-nowrap text-stone">
                {r.access_ends_at ? day(r.access_ends_at) : "—"}
              </td>
              <td className="py-1 pr-3">
                {r.status === "received" ? (
                  <span className="font-semibold text-ochre">Waiting for the refund</span>
                ) : r.status === "refunded" ? (
                  <span className="font-semibold text-success">Refunded</span>
                ) : (
                  <span className="text-stone">Cancelled</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

type SeatRow = {
  buyer_id: string;
  email: string;
  partner_id: string | null;
  status: string;
  invited_at: string;
  joined_at: string | null;
};

/** Who has given their seat to whom (6.8), and whether it is in use. */
function Seats({ seats, people }: { seats: SeatRow[]; people: Participant[] }) {
  if (seats.length === 0) return null;
  const emailOf = (id: string | null) => people.find((p) => p.id === id)?.email ?? null;
  return (
    <section className="mt-8 rounded-2xl bg-white p-5">
      <h2 className="text-lg font-semibold text-pine">Partner seats</h2>
      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-stone">
            <th className="py-1 pr-3 font-medium">Buyer</th>
            <th className="py-1 pr-3 font-medium">Seat with</th>
            <th className="py-1 pr-3 font-medium">Since</th>
            <th className="py-1 pr-3 font-medium">In use</th>
          </tr>
        </thead>
        <tbody>
          {seats.map((s) => (
            <tr key={s.buyer_id} className="border-b border-line/60 align-top">
              <td className="py-1 pr-3">{emailOf(s.buyer_id) ?? s.buyer_id.slice(0, 8)}</td>
              <td className="py-1 pr-3">{s.email}</td>
              <td className="py-1 pr-3 whitespace-nowrap text-stone">{day(s.invited_at)}</td>
              <td className="py-1 pr-3">
                {s.status === "ended" ? (
                  <span className="text-stone">Ended</span>
                ) : s.joined_at ? (
                  <span className="font-semibold text-success">Since {day(s.joined_at)}</span>
                ) : (
                  <span className="text-ochre">Invited, not signed in</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-stone">
        A seat is set once. Moving one is a manual change in partner_seats, on an email request.
      </p>
    </section>
  );
}

function AdminOverview() {
  const [data, setData] = useState<Participant[] | null>(null);
  const [emailOff, setEmailOff] = useState(false);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [buyingRequired, setBuyingRequired] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/participants")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        if (cancelled) return;
        setData(body.participants);
        setEmailOff(body.emailNotifications === false);
        setWebhooks(body.webhooks ?? []);
        setSeats(body.seats ?? []);
        setWithdrawals(body.withdrawals ?? []);
        setBuyingRequired(body.buyingRequired !== false);
      })
      .catch((e) => !cancelled && setError((e as Error).message || "Could not load the overview."));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="rounded-lg bg-sand p-4">{error}</p>;
  if (!data) return <p className="text-stone">One moment…</p>;

  const totalCost = data.reduce((t, p) => t + p.usage.costUsd, 0);
  const totalMessages = data.reduce((t, p) => t + p.usage.chatMessages, 0);
  const freePeople = data.filter((p) => p.free);
  const freeCost = freePeople.reduce((t, p) => t + p.usage.costUsd, 0);
  const updateList = data.filter((p) => p.wantsUpdates).map((p) => p.email);
  const ratings = data.flatMap((p) => p.feedback.map((f) => f.rating).filter((r): r is number => r !== null));
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";

  return (
    <>
      <h1 className="text-3xl font-bold text-pine">Admin</h1>
      {emailOff && (
        <p className="mt-3 rounded-lg bg-ochre-soft p-3 text-sm">
          Questions are saved and shown here, but no email is sent: RESEND_API_KEY is missing. Add it in Vercel to get
          every question in your inbox, and so a new buyer gets their welcome email.
        </p>
      )}
      {!buyingRequired && (
        <p className="mt-3 rounded-lg bg-ochre-soft p-3 text-sm">
          <strong>Buying is not required.</strong> Everyone signed in can open every released step, whatever they own.
          Switch NEXT_PUBLIC_REQUIRE_PURCHASE on in Vercel and redeploy, after giving the people below what they
          should keep.
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-5">
        {[
          ["Participants", n(data.length)],
          ["Free accounts", n(freePeople.length)],
          ["Questions", n(data.reduce((t, p) => t + p.questions.length, 0))],
          ["AI messages", n(totalMessages)],
          ["Average feedback", `${avg} / 5`],
          ["Estimated AI cost", usd(totalCost)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-4">
            <p className="text-sm text-stone">{label}</p>
            <p className="text-2xl font-semibold text-pine">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-stone">
        Cost is an estimate for claude-opus-5 ($5 in, $25 out, $0.50 cache per million tokens). Saving the workbook to
        the cache is not counted, so the real cost is a little higher. Your Anthropic Console shows the exact bill. Of
        that, {usd(freeCost)} is free accounts.
      </p>
      <Withdrawals rows={withdrawals} />
      <Webhooks events={webhooks} />
      <Seats seats={seats} people={data} />
      <UpdateList emails={updateList} />
      {data.length === 0 && (
        <p className="mt-6 rounded-lg bg-sand p-4">No participants yet. They appear here after they sign in.</p>
      )}
      <ul className="mt-6 space-y-4">
        {data.map((p) => (
          <ParticipantCard key={p.id} p={p} />
        ))}
      </ul>
    </>
  );
}

export default function AdminPage() {
  return (
    <Shell>
      <RequireUser>
        <AdminOverview />
      </RequireUser>
    </Shell>
  );
}
