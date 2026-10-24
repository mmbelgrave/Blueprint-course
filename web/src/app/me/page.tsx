"use client";
// "What my AI partner knows about me" (brief 4.4): see, correct and forget what the
// AI partner remembers — and delete everything.
import { useEffect, useState } from "react";
import { RequireUser, Shell } from "@/components/Shell";
import { isFree } from "@/lib/access-app";
import { useApp } from "@/lib/app-state";
import { deleteAllPictures, picturesAvailable } from "@/lib/backend/pictures";
import { isSupabaseConfigured, store } from "@/lib/backend";
import { SHARED_NOTE_NOTE } from "@/lib/ai-sharing";
import { isEmptyItem, PROFILE_FIELDS, type AiProfile, type ProfileKey } from "@/lib/profile-fields";
import { sharedNoteKeys } from "@/lib/together-app";

type Field = (typeof PROFILE_FIELDS)[number];

function asLines(v: string | string[] | undefined) {
  return Array.isArray(v) ? v.join("\n") : (v ?? "");
}

function ProfileItem({
  field,
  profile,
  onSave,
  onForget,
  shared,
  locked: pageBusy,
}: {
  field: Field;
  profile: AiProfile;
  onSave: (next: AiProfile) => Promise<void>;
  /**
   * Forgetting a note made from a shared page, which takes it away for both
   * people (item B2). Given only for those notes, and only in a household.
   */
  onForget?: (forget: boolean) => Promise<void>;
  shared?: boolean;
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
  /** Forget, or allow again: on both sides when the note is a shared one. */
  const forgetIt = async (forget: boolean, mine: AiProfile) => {
    if (!onForget) return save(mine);
    setSaving(true);
    try {
      await onForget(forget);
    } finally {
      setSaving(false);
    }
  };
  const without = (list: ProfileKey[] | undefined) => (list ?? []).filter((k) => k !== field.key);

  return (
    <li className="rounded-2xl bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-pine">{field.label}</h2>
        {shared && <span className="text-xs text-stone">{SHARED_NOTE_NOTE}</span>}
        {corrected && <span className="text-xs text-success">You corrected this</span>}
        {forgotten && (
          <span className="text-xs text-stone">Forgotten. Your AI partner does not use this topic</span>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          {field.kind === "list" && <p className="text-sm text-stone">One item per line.</p>}
          <textarea
            aria-label={field.label}
            className="field-input"
            rows={field.kind === "list" ? 4 : 3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex justify-center gap-2">
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
              <p className="text-stone">Nothing yet.</p>
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
              className="text-pine underline disabled:opacity-50"
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
                className="text-pine underline"
                disabled={busy}
                onClick={() => forgetIt(false, { ...profile, _forgotten: without(profile._forgotten) })}
              >
                Allow again
              </button>
            ) : (
              <button
                className="text-stone underline"
                disabled={busy}
                onClick={() =>
                  forgetIt(true, {
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
  const { entitlements, household, signOut, user } = useApp();
  // A free account has no pictures and no AI partner, so it is not told that
  // things it never had are about to be deleted.
  const free = isFree(entitlements);
  const [sure, setSure] = useState(false);
  const [alsoAccount, setAlsoAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="mt-10 space-y-3 rounded-2xl border-2 border-ochre p-5">
      <h2 className="text-xl font-semibold text-pine">Delete everything I wrote</h2>
      <p>
        {free
          ? "This deletes everything you have written here. It cannot be undone."
          : "This deletes your workbook answers, your pictures, your chats with your AI partner, what your AI partner knows about you, your results and your feedback. It cannot be undone."}
      </p>
      {/* The pages the two of them answered together are stored on the
          buyer's rows, so the buyer deleting takes them from both (lawyer,
          24 October, item B4e). Said before the tick, not after. */}
      {household.role === "buyer" && <p>Shared answers will also be deleted for your partner.</p>}
      {/* The course somebody paid for is not something they wrote, and it
          used to go with the rest (Mwata, 20 October). */}
      <p className="text-stone">
        Your sign-in and what you have bought stay, so you can start again with an empty workbook. Tick the second box
        if you want the account gone as well.
      </p>
      <label className="flex gap-3">
        <input
          type="checkbox"
          className="mt-1.5 h-5 w-5 accent-pine"
          checked={sure}
          onChange={(e) => setSure(e.target.checked)}
        />
        <span>I understand that everything I wrote will be deleted.</span>
      </label>
      <label className="flex gap-3">
        <input
          type="checkbox"
          className="mt-1.5 h-5 w-5 accent-ochre"
          checked={alsoAccount}
          onChange={(e) => setAlsoAccount(e.target.checked)}
        />
        <span>
          Delete my account as well.{" "}
          {free
            ? "I will not be able to sign in with this address again."
            : "I understand that this also ends my access to what I bought, and that it cannot be given back."}
        </span>
      </label>
      <div className="flex justify-center">
      <button
        className="btn btn-ochre"
        disabled={!sure || busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            // The pictures first, from here: without the service role key the
            // server cannot reach the picture store, and this screen promises
            // that everything goes. The server deletes them again if it can.
            if (picturesAvailable && user) await deleteAllPictures(user.id).catch(() => undefined);
            const res = await fetch("/api/account/delete", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ account: alsoAccount }),
            });
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
            // Sign out first, then leave with a full page load: a client-side
            // move is overtaken by this page's own "please sign in" guard, and
            // someone who just deleted their life story lands on a login form.
            await signOut().catch(() => undefined);
            window.location.replace(`/deleted?account=${body.accountDeleted ? 1 : 0}`);
          } catch (e) {
            setError((e as Error).message || "Not everything could be deleted. Please try again.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Deleting…" : alsoAccount ? "Delete everything and my account" : "Delete everything I wrote"}
      </button>
      </div>
      {error && (
        <p role="alert" className="text-ochre">
          {error}
        </p>
      )}
    </section>
  );
}

function PartnerKnows() {
  const { user, household } = useApp();
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

  /*
   * The notes drawn from the pages the household answers together. They are
   * about both people, so forgetting one forgets it on both sides, and the
   * server does that rather than the browser (item B2).
   */
  const inAHousehold = household.role !== "alone";
  const shared = new Set(inAHousehold ? sharedNoteKeys() : []);
  const forgetShared = async (key: ProfileKey, forget: boolean) => {
    try {
      const res = await fetch("/api/notes/shared", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, forget }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setProfile(body.profile as AiProfile);
      setNote(null);
    } catch (e) {
      setNote((e as Error).message || "This was not saved. Please check your internet and try again.");
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-pine">What my AI partner knows about me</h1>
      <p className="mt-3 max-w-2xl text-lg">
        Your AI partner writes short notes from your answers, so it remembers you on every page. Here you see
        these notes.
      </p>
      <ul className="mt-3 max-w-2xl list-disc space-y-1 pl-6 text-stone">
        <li>
          <span className="font-semibold text-granite">Correct this:</span> the note is wrong. Your AI partner keeps
          your version from now on.
        </li>
        <li>
          <span className="font-semibold text-granite">Forget this:</span> your AI partner deletes the note and stops
          using your answers about this topic. Your answers are not deleted from your workbook.
        </li>
      </ul>

      {!isSupabaseConfigured ? (
        <p className="mt-6 rounded-lg bg-sand p-4">This works when you are signed in with an account.</p>
      ) : state === "loading" ? (
        <p className="mt-6 text-stone">One moment…</p>
      ) : state === "error" ? (
        <p className="mt-6 text-ochre">Your AI partner&apos;s notes could not be loaded. Please reload the page.</p>
      ) : (
        <>
          {note && (
            <p role="alert" className="mt-2 text-ochre">
              {note}
            </p>
          )}
          <ul className="mt-6 space-y-4">
            {PROFILE_FIELDS.map((f) => (
              <ProfileItem
                key={f.key}
                field={f}
                profile={profile ?? {}}
                onSave={save}
                shared={shared.has(f.key)}
                onForget={shared.has(f.key) ? (forget) => forgetShared(f.key, forget) : undefined}
                locked={updating}
              />
            ))}
          </ul>
          {/* After the notes: ask your AI partner to read your answers again. */}
          <div className="mt-6 flex flex-col items-center gap-2">
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
              <span className="text-sm text-stone">
                Last updated {new Date(profile.last_updated).toLocaleString()}
              </span>
            )}
          </div>
        </>
      )}

      <DeleteEverything />
    </>
  );
}

function DeleteOnly() {
  return (
    <>
      <h1 className="text-3xl font-bold text-pine">Your account</h1>
      <p className="mt-2 text-stone">
        A free account has no AI partner, so there is nothing it remembers about you. What you typed is stored in your
        own account and nowhere else.
      </p>
      <DeleteEverything />
    </>
  );
}

export default function MePage() {
  const { entitlements } = useApp();
  const free = isFree(entitlements);
  return (
    <Shell>
      <RequireUser>{free ? <DeleteOnly /> : <PartnerKnows />}</RequireUser>
    </Shell>
  );
}
