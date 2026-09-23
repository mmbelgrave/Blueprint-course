"use client";
// The AI partner panel: helper buttons, a chat per page, replies that stream in.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-state";
import { isSupabaseConfigured, store, type ChatMessage } from "@/lib/backend";
import { HELPER_LABELS, STATUS_MARK, type PartnerHelper, type PartnerStatus } from "@/lib/partner/protocol";

const MAX_CHARS = 4000;

function Header() {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="block h-9 w-9 shrink-0 rounded-full bg-indigo ring-4 ring-indigo-soft" />
      <div>
        <p className="font-semibold text-indigo">
          Your AI partner
        </p>
        <p className="text-sm text-muted">I help you think. You decide.</p>
      </div>
    </div>
  );
}

export function PartnerPanel({ exerciseId }: { exerciseId: string }) {
  const { user, profile, answers } = useApp();
  // Each visit starts with an empty chat. Earlier messages on this page are still
  // saved and still known to the partner; the person can show them on request.
  const [earlier, setEarlier] = useState<ChatMessage[]>([]);
  const [showEarlier, setShowEarlier] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    store.loadConversation(user.id, exerciseId).then(
      (m) => {
        if (cancelled) return;
        setEarlier(m);
        setLoadState("ready");
      },
      () => !cancelled && setLoadState("error"),
    );
    return () => {
      cancelled = true;
    };
  }, [user, exerciseId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <Header />
        <p className="mt-4 rounded-lg bg-sand p-3 text-sm text-muted">
          Your AI partner works when you are signed in with an account. This is preview mode.
        </p>
      </div>
    );
  }

  if (profile && !profile.consent_ai) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <Header />
        <p className="mt-4 rounded-lg bg-sand p-3 text-sm text-muted">
          Your AI partner is switched off. You can switch it on in{" "}
          <Link href="/settings" className="underline">
            My settings
          </Link>
          .
        </p>
      </div>
    );
  }

  async function send(helper: PartnerHelper | null) {
    const text = helper ? HELPER_LABELS[helper] : draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    if (!helper) setDraft("");
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);

    const setReply = (reply: string) =>
      setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: reply }]);
    const undo = () => {
      setMessages((m) => m.slice(0, -2));
      if (!helper) setDraft(text);
    };

    try {
      const res = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId,
          helper,
          message: helper ? undefined : text,
          pageAnswers: answers[exerciseId] ?? {},
        }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        undo();
        setError(body.error ?? "Your AI partner needs a moment. Please try again.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        setReply(raw.split(STATUS_MARK)[0]);
      }
      const [reply, statusJson] = raw.split(STATUS_MARK);
      const status: PartnerStatus = statusJson ? JSON.parse(statusJson) : { ok: false };
      if (!status.ok) {
        if (reply.trim()) setReply(reply);
        else undo();
        setError(status.error ?? "Your AI partner needs a moment. Please try again.");
      } else if (status.trimmed) {
        setNotice("Your message was very long, so your AI partner read the first part.");
      }
    } catch {
      undo();
      setError("Your AI partner needs a moment. Please check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-h-[calc(100vh-3rem)] flex-col rounded-2xl bg-white p-5 shadow-sm">
      <Header />

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(Object.keys(HELPER_LABELS) as PartnerHelper[]).map((h) => (
          <button
            key={h}
            type="button"
            disabled={busy || loadState !== "ready"}
            onClick={() => send(h)}
            className="rounded-xl border border-sand-deep px-3 py-2 text-left text-sm hover:border-indigo disabled:opacity-50"
          >
            {HELPER_LABELS[h]}
          </button>
        ))}
      </div>

      <div
        ref={listRef}
        aria-live="polite"
        className="mt-4 min-h-[6rem] flex-1 space-y-3 overflow-y-auto pr-1 lg:max-h-[50vh]"
      >
        {loadState === "loading" && <p className="text-sm text-muted">One moment…</p>}
        {loadState === "error" && (
          <p className="text-sm text-amber">Your earlier chat could not be loaded. Please reload the page.</p>
        )}
        {loadState === "ready" && earlier.length > 0 && (
          <div className="space-y-3">
            <button
              type="button"
              aria-expanded={showEarlier}
              onClick={() => setShowEarlier(!showEarlier)}
              className="text-sm text-indigo underline"
            >
              {showEarlier
                ? "Hide earlier conversation"
                : `Show earlier conversation on this page (${earlier.length} messages)`}
            </button>
            {showEarlier && (
              <>
                {earlier.map((m, i) => (
                  <div
                    key={`e${i}`}
                    className={
                      m.role === "user"
                        ? "ml-6 rounded-xl bg-indigo-soft/60 px-3 py-2 text-sm text-muted"
                        : "mr-2 whitespace-pre-line rounded-xl bg-sand/60 px-3 py-2 text-sm text-muted"
                    }
                  >
                    {m.content}
                  </div>
                ))}
                <p className="border-t border-sand-deep pt-2 text-center text-xs text-muted">This visit</p>
              </>
            )}
          </div>
        )}
        {loadState === "ready" && messages.length === 0 && (
          <p className="text-sm text-muted">
            {earlier.length > 0
              ? "Your AI partner remembers your earlier conversation. Press a button above, or write below."
              : "Stuck, or want a second look? Press a button above, or write to your AI partner below."}
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-6 rounded-xl bg-indigo-soft px-3 py-2 text-sm"
                : "mr-2 whitespace-pre-line rounded-xl bg-sand px-3 py-2 text-sm"
            }
          >
            {m.role === "assistant" && !m.content && busy ? <span className="text-muted">Thinking…</span> : m.content}
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-amber">
          {error}
        </p>
      )}
      {notice && <p className="mt-2 text-sm text-muted">{notice}</p>}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(null);
        }}
      >
        <textarea
          aria-label="Write to your AI partner"
          placeholder="Write to your AI partner…"
          rows={2}
          maxLength={MAX_CHARS * 2}
          className="field-input flex-1 resize-none text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(null);
            }
          }}
        />
        <button className="btn btn-primary self-end px-4 py-2 text-sm" disabled={busy || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
