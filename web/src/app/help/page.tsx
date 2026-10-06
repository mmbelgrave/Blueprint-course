"use client";
/*
 * Ask a question. By email only: answering someone's own plans on WhatsApp
 * reads as a service, and the shop does not allow services (spec 6.10). The
 * form is there for everyone whose computer does not open a mail app when you
 * click an address.
 *
 * Coming from an exercise page, the step and the page are already filled in.
 * This is app text, not workbook text, so it lives here and not in a content
 * file.
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { isSupabaseConfigured } from "@/lib/backend";
import { steps } from "@/lib/content";
import {
  checkQuestion,
  mailBody,
  mailSubject,
  mailtoHref,
  MAX_QUESTION,
  SUPPORT,
  supportTopics,
  topicHasPage,
  topicLabel,
} from "@/lib/support";

const TOPICS = supportTopics(steps.map((s) => s.step));

type Earlier = { id: number; topic: string; page: string | null; question: string; date: string };

const onDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

function AskForm() {
  const params = useSearchParams();
  const { profile } = useApp();
  const [topic, setTopic] = useState(params.get("topic") ?? "general");
  const [page, setPage] = useState(params.get("page") ?? "");
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [earlier, setEarlier] = useState<Earlier[]>([]);

  const draft = { topic, page: topicHasPage(topic) ? page.trim() || undefined : undefined, question };

  // Re-read the list after a question is sent. Earlier questions are a nicety:
  // if they cannot be read, asking a new one still works.
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    fetch("/api/question")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!cancelled && body) setEarlier((body.questions as Earlier[]) ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const send = async () => {
    const wrong = checkQuestion(draft);
    if (wrong) {
      setProblem(wrong);
      return;
    }
    setProblem(null);
    setState("sending");
    try {
      const res = await fetch("/api/question", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        setProblem(((await res.json()) as { error?: string }).error ?? "Please try again in a minute.");
        setState("idle");
        return;
      }
      setQuestion("");
      setState("sent");
      setReload((n) => n + 1);
    } catch {
      setProblem("We could not reach the server. Please check your internet and try again.");
      setState("idle");
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl bg-white p-5 sm:p-6">
        <h2 className="text-xl text-pine">Ask me a question</h2>

        <label className="block">
          <span className="mb-1 block font-medium">What is your question about?</span>
          <select
            className="field-input"
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              if (!topicHasPage(e.target.value)) setPage("");
            }}
          >
            {TOPICS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {topicHasPage(topic) && (
          <label className="block">
            <span className="mb-1 block font-medium">Which page? (optional)</span>
            <input
              type="text"
              className="field-input"
              placeholder="1.2 My picture"
              value={page}
              onChange={(e) => setPage(e.target.value)}
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1 block font-medium">Your question</span>
          <textarea
            className="field-input"
            rows={5}
            maxLength={MAX_QUESTION}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>

        {isSupabaseConfigured ? (
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary" disabled={state === "sending"} onClick={send}>
              {state === "sending" ? "Sending…" : "Send my question"}
            </button>
            {state === "sent" && (
              <span className="font-semibold text-success">
                ✓ I have your question{profile?.first_name ? `, ${profile.first_name}` : ""}.
              </span>
            )}
          </div>
        ) : (
          <p className="rounded-lg bg-sand p-3 text-stone">
            Preview mode has no account, so the form cannot send. The email link below works.
          </p>
        )}

        {problem && (
          <p role="alert" className="rounded-lg bg-ochre-soft p-3">
            {problem}
          </p>
        )}

        <p className="text-stone">
          I read every question myself and reply by email as soon as I can, in English or Dutch.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-line p-5">
        <h2 className="text-xl text-pine">Or write to me yourself</h2>
        <p className="text-stone">
          Whatever you chose above travels with the message, so you do not have to explain where you were.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            className="btn btn-ghost"
            href={mailtoHref(mailSubject(topicLabel(TOPICS, topic), draft.page), mailBody(question))}
          >
            Email
          </a>
        </div>
        <p className="text-sm text-stone">{SUPPORT.email}</p>
      </section>

      {earlier.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-line p-5">
          <h2 className="text-xl text-pine">What you asked before</h2>
          <ul className="space-y-3">
            {earlier.map((q) => (
              <li key={q.id}>
                <p className="text-sm text-stone">
                  {onDate(q.date)} · {q.topic}
                  {q.page ? ` · ${q.page}` : ""}
                </p>
                <p className="whitespace-pre-wrap">{q.question}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-stone">My answer comes by email, not here.</p>
        </section>
      )}
    </div>
  );
}

export default function Help() {
  return (
    <Shell>
      <RequireUser allowNoProfile>
        <article className="mx-auto max-w-2xl space-y-6">
          <header>
            <h1 className="text-3xl text-pine">Help</h1>
            <p className="mt-2 text-lg">
              Your AI partner answers most questions right away, on the page you are working on. Use this for the ones
              only I can answer.
            </p>
            <p className="mt-2 text-stone">
              I share my own experience. For legal, tax and money questions I help you find the right professional.
            </p>
          </header>

          <Suspense fallback={<p className="text-stone">One moment…</p>}>
            <AskForm />
          </Suspense>

          <p className="text-center">
            <Link href="/dashboard" className="btn btn-ghost">
              Back to the overview
            </Link>
          </p>
        </article>
      </RequireUser>
    </Shell>
  );
}
