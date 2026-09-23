"use client";
// "What my AI partner knows about me" (brief 4.4): see, correct and forget what the
// AI partner remembers — and delete everything.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { isSupabaseConfigured, store } from "@/lib/backend";
import { isEmptyItem, PROFILE_FIELDS, type AiProfile, type ProfileKey } from "@/lib/profile-fields";

type Field = (typeof PROFILE_FIELDS)[number];

function asLines(v: string | string[] | undefined) {
  return Array.isArray(v) ? v.join("\n") : (v ?? "");
}

function ProfileItem({
  field,
  profile,
  onSave,
  locked: pageBusy,
}: {
  field: Field;
  profile: AiProfile;
  onSave: (next: AiProfile) => Promise<void>;
  /** True while the notes are being updated: no changes then (review R2-1). */
  locked: boolean;
}) {
  const value = profile[field.key];
  const corrected = profile._locked?.includes(field.key);
  const forgotten = profile._forgotten?.includes(field.key);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = saving || pageBusy;

  const save = async (next: AiProfile) => {
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };
  const without = (list: ProfileKey[] | undefined) => (list ?? []).filter((k) => k !== field.key);

  return (
    <li className="rounded-2xl bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-indigo">{field.label}</h2>
        {corrected && <span className="text-xs text-green">You corrected this</span>}
        {forgotten && (
          <span className="text-xs text-muted">Forgotten — your AI partner does not use this topic</span>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          {field.kind === "list" && <p className="text-sm text-muted">One item per line.</p>}
          <textarea
            aria-label={field.label}
            className="field-input"
            rows={field.kind === "list" ? 4 : 3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="btn btn-primary py-1.5 text-sm"
              disabled={busy}
              onClick={() => {
                const v =
                  field.kind === "list" ? draft.split("\n").map((s) => s.trim()).filter(Boolean) : draft.trim();
                save({
                  ...profile,
                  [field.key]: v,
                  _locked: [...without(profile._locked), field.key],
                  _forgotten: without(profile._forgotten),
                });
              }}
            >
              Save
            </button>
            <button className="btn btn-ghost py-1.5 text-sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-2">
            {isEmptyItem(value) ? (
              <p className="text-muted">Nothing yet.</p>
            ) : Array.isArray(value) ? (
              <ul className="list-disc space-y-1 pl-6">
                {value.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            ) : (
              <p className="whitespace-pre-line">{value}</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <button
              className="text-indigo underline disabled:opacity-50"
              disabled={busy}
              onClick={() => {
                setDraft(asLines(value));
                setEditing(true);
              }}
            >
              Correct this
            </button>
            {forgotten ? (
              <button
                className="text-indigo underline"
                disabled={busy}
                onClick={() => save({ ...profile, _forgotten: without(profile._forgotten) })}
              >
                Allow again
              </button>
            ) : (
              <button
                className="text-muted underline"
                disabled={busy}
                onClick={() =>
                  save({
                    ...profile,
                    [field.key]: field.kind === "list" ? [] : "",
                    // The patterns note may mention this topic; it is rebuilt at the next update.
                    ...(profile._locked?.includes("patterns_and_tensions") ? {} : { patterns_and_tensions: [] }),
                    _forgotten: [...without(profile._forgotten), field.key],
                    _locked: without(profile._locked),
                  })
                }
              >
                Forget this
              </button>
            )}
          </div>
        </>
      )}
    </li>
  );
}

function DeleteEverything() {
  const router = useRouter();
  const { signOut } = useApp();
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="mt-10 space-y-3 rounded-2xl border-2 border-amber p-5">
      <h2 className="text-xl font-semibold text-indigo">Delete everything</h2>
      <p>
        This deletes all your answers, your chats with your AI partner, what your AI partner knows about you, your
        results and your feedback. It cannot be undone.
      </p>
      <label className="flex gap-3">
        <input
          type="checkbox"
          className="mt-1.5 h-5 w-5 accent-indigo"
          checked={sure}
          onChange={(e) => setSure(e.target.checked)}
        />
        <span>I understand that everything will be deleted.</span>
      </label>
      <button
        className="btn btn-amber"
        disabled={!sure || busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/account/delete", { method: "POST" });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error);
            // Also forget what this browser remembers (last page opened) — review R2 concern 3.
            try {
              for (const key of Object.keys(window.localStorage)) {
                if (key.startsWith("blueprint-")) window.localStorage.removeItem(key);
              }
            } catch {
              // Storage blocked: nothing stored there either.
            }
            router.replace(`/deleted?account=${body.accountDeleted ? 1 : 0}`);
            await signOut();
          } catch (e) {
            setError((e as Error).message || "Not everything could be deleted. Please try again.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Deleting…" : "Delete everything"}
      </button>
      {error && (
        <p role="alert" className="text-amber">
          {error}
        </p>
      )}
    </section>
  );
}

function PartnerKnows() {
  const { user } = useApp();
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    store.loadAiProfile(user.id).then(
      (p) => {
        if (cancelled) return;
        setProfile((p as AiProfile) ?? {});
        setState("ready");
      },
      () => !cancelled && setState("error"),
    );
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = async (next: AiProfile) => {
    if (!user) return;
    try {
      await store.saveAiProfile(user.id, next);
      setProfile(next);
      setNote(null);
    } catch {
      setNote("This was not saved. Please check your internet and try again.");
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-indigo">What my AI partner knows about me</h1>
      <p className="mt-3 max-w-2xl text-lg">
        Your AI partner writes short notes from your answers, so it remembers you on every page. Here you see
        these notes.
      </p>
      <ul className="mt-3 max-w-2xl list-disc space-y-1 pl-6 text-muted">
        <li>
          <span className="font-semibold text-ink">Correct this:</span> the note is wrong. Your AI partner keeps
          your version from now on.
        </li>
        <li>
          <span className="font-semibold text-ink">Forget this:</span> your AI partner deletes the note and stops
          using your answers about this topic. Your answers stay in your workbook, for you. Only when you open that
          page and ask for help there, your AI partner can see what is on it.
        </li>
      </ul>

      {!isSupabaseConfigured ? (
        <p className="mt-6 rounded-lg bg-sand p-4">This works when you are signed in with an account.</p>
      ) : state === "loading" ? (
        <p className="mt-6 text-muted">One moment…</p>
      ) : state === "error" ? (
        <p className="mt-6 text-amber">Your AI partner&apos;s notes could not be loaded. Please reload the page.</p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              className="btn btn-ghost text-sm"
              disabled={updating}
              onClick={async () => {
                setUpdating(true);
                setNote(null);
                try {
                  const res = await fetch("/api/profile", { method: "POST" });
                  const body = await res.json();
                  if (!res.ok) throw new Error(body.error);
                  setProfile(body.profile);
                } catch (e) {
                  setNote((e as Error).message || "Your AI partner needs a moment. Please try again.");
                } finally {
                  setUpdating(false);
                }
              }}
            >
              {updating ? "Updating…" : "Update from my answers now"}
            </button>
            {profile?.last_updated && (
              <span className="text-sm text-muted">
                Last updated {new Date(profile.last_updated).toLocaleString()}
              </span>
            )}
          </div>
          {note && (
            <p role="alert" className="mt-2 text-amber">
              {note}
            </p>
          )}
          <ul className="mt-6 space-y-4">
            {PROFILE_FIELDS.map((f) => (
              <ProfileItem key={f.key} field={f} profile={profile ?? {}} onSave={save} locked={updating} />
            ))}
          </ul>
        </>
      )}

      <DeleteEverything />
    </>
  );
}

export default function MePage() {
  return (
    <Shell>
      <RequireUser>
        <PartnerKnows />
      </RequireUser>
    </Shell>
  );
}
