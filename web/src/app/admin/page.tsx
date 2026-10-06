"use client";
// Admin overview (brief 4.7). Only the admin gets data: the server checks.
import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireUser, Shell } from "@/components/Shell";
import { products } from "@/lib/access-app";

type Participant = {
  id: string;
  email: string;
  name: string;
  started: string;
  lastActivity: string | null;
  consentFounder: boolean;
  consentAi: boolean;
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
    replyBy: "email" | "whatsapp";
    whatsapp: string;
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
                  {q.replyBy === "whatsapp" ? (
                    <a
                      className="text-pine underline"
                      href={`https://wa.me/${q.whatsapp.replace(/D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Reply on WhatsApp ({q.whatsapp})
                    </a>
                  ) : (
                    <a className="text-pine underline" href={`mailto:${p.email}`}>
                      Reply by email
                    </a>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Owns p={p} />

      <div className="border-t border-line pt-3 text-sm">
        {p.consentFounder ? (
          <Link href={`/admin/${p.id}`} className="btn btn-ghost py-1.5 text-sm">
            Read answers and AI notes
          </Link>
        ) : (
          <p className="text-stone">No consent to read answers. You see progress and feedback only.</p>
        )}
        {!p.consentAi && <p className="mt-1 text-stone">AI partner switched off by this person.</p>}
      </div>
    </li>
  );
}

function AdminOverview() {
  const [data, setData] = useState<Participant[] | null>(null);
  const [emailOff, setEmailOff] = useState(false);
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
  const ratings = data.flatMap((p) => p.feedback.map((f) => f.rating).filter((r): r is number => r !== null));
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";

  return (
    <>
      <h1 className="text-3xl font-bold text-pine">Admin</h1>
      {emailOff && (
        <p className="mt-3 rounded-lg bg-ochre-soft p-3 text-sm">
          Questions are saved and shown here, but no email is sent: RESEND_API_KEY is missing. Add it in Vercel to get
          every question in your inbox.
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-5">
        {[
          ["Participants", n(data.length)],
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
        the cache is not counted, so the real cost is a little higher. Your Anthropic Console shows the exact bill.
      </p>
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
