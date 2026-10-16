"use client";
/**
 * Signing out, in Settings (spec §6.9: "Settings, Help, and signing out").
 *
 * It was only ever in the header, which is hidden on a phone, so on a phone
 * there was no way out at all. It matters more now there are households: two
 * people sharing one laptop have to be able to swap, and so does anybody who
 * reads their partner's invitation on the family tablet.
 *
 * The address is shown next to it, because the first question when swapping
 * accounts is "who am I signed in as".
 */
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { resetIsAdmin } from "@/lib/use-is-admin";

export function SignOutCard() {
  const { user, saveState, household, signOut } = useApp();
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const unsaved = saveState === "saving" || saveState === "error";

  return (
    <div className="mt-8 border-t border-line pt-8">
      <h2 className="text-xl font-semibold text-pine">Signing out</h2>
      <p className="mt-1 text-sm text-stone">
        You are signed in{user.email ? " as " : ""}
        {user.email && <strong className="text-pine">{user.email}</strong>}
        {household.role === "partner" ? ", on the seat that came with somebody else's purchase" : ""}. Everything you
        have written is saved and waiting when you come back. There is no password: you ask for a code each time.
      </p>
      {unsaved && (
        <p className="mt-3 rounded-lg bg-ochre-soft p-3 text-sm">
          One of your answers is still being saved. Give it a moment before you go.
        </p>
      )}
      <p className="mt-3 flex justify-center">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            resetIsAdmin();
            await signOut().catch(() => undefined);
            /*
             * A full page load, not a client-side move: this page's own "please
             * sign in" guard would otherwise race the sign-out and leave
             * somebody looking at a login form inside a signed-in shell. It
             * also drops every scrap of the last account from memory, which is
             * the point when two people share one laptop.
             */
            window.location.replace("/");
          }}
        >
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </p>
    </div>
  );
}
