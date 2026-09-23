"use client";
// Admin overview (brief 4.7). Only the admin gets data: the server checks.
import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireUser, Shell } from "@/components/Shell";

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

function ParticipantCard({ p }: { p: Participant }) {
  return (
    <li className="space-y-4 rounded-2xl bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-indigo">{p.name || "(no name yet)"}</h2>
          <p className="text-sm text-muted">{p.email}</p>
        </div>
        <p className="text-sm text-muted">
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
                    part.complete && part.total ? "bg-green-soft text-green" : part.done ? "bg-indigo-soft" : "bg-sand text-muted"
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
        <p className="text-xs text-muted">* optional part</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">AI use</h3>
          <p className="text-sm">
            {n(p.usage.chatMessages)} messages · {n(p.usage.drafts)} drafts · {n(p.usage.noteUpdates)} note updates
          </p>
          <p className="text-sm text-muted">
            Tokens: {n(p.usage.inputTokens)} in · {n(p.usage.outputTokens)} out · {n(p.usage.cacheReadTokens)} from cache
          </p>
          <p className="text-sm">
            Estimated cost: <strong>{usd(p.usage.costUsd)}</strong>
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Feedback</h3>
          {p.feedback.length === 0 ? (
            <p className="text-sm text-muted">None yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {p.feedback.map((f, i) => (
                <li key={i}>
                  <span className="font-medium">{f.part}:</span>{" "}
                  <span className="text-amber">{"★".repeat(f.rating ?? 0)}</span>
                  <span className="text-sand-deep">{"★".repeat(5 - (f.rating ?? 0))}</span>
                  {f.comment && <span className="text-muted"> — {f.comment}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-sand-deep pt-3 text-sm">
        {p.consentFounder ? (
          <Link href={`/admin/${p.id}`} className="btn btn-ghost py-1.5 text-sm">
            Read answers and AI notes
          </Link>
        ) : (
          <p className="text-muted">No consent to read answers. You see progress and feedback only.</p>
        )}
        {!p.consentAi && <p className="mt-1 text-muted">AI partner switched off by this person.</p>}
      </div>
    </li>
  );
}

function AdminOverview() {
  const [data, setData] = useState<Participant[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/participants")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        if (!cancelled) setData(body.participants);
      })
      .catch((e) => !cancelled && setError((e as Error).message || "Could not load the overview."));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="rounded-lg bg-sand p-4">{error}</p>;
  if (!data) return <p className="text-muted">One moment…</p>;

  const totalCost = data.reduce((t, p) => t + p.usage.costUsd, 0);
  const totalMessages = data.reduce((t, p) => t + p.usage.chatMessages, 0);
  const ratings = data.flatMap((p) => p.feedback.map((f) => f.rating).filter((r): r is number => r !== null));
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";

  return (
    <>
      <h1 className="text-3xl font-bold text-indigo">Admin</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {[
          ["Participants", n(data.length)],
          ["AI messages", n(totalMessages)],
          ["Average feedback", `${avg} / 5`],
          ["Estimated AI cost", usd(totalCost)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="text-2xl font-semibold text-indigo">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
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
