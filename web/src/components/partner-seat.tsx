"use client";
/**
 * The partner seat, in Settings (spec §6.8).
 *
 * One seat per purchase, set once. The address is typed here and the person
 * gets a letter; changing it later is an email to Mwata, which the card says
 * plainly rather than hiding behind a button that refuses.
 *
 * A free account sees nothing: the seat comes with the course.
 */
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { invitationProblem } from "@/lib/household";

type SeatState = {
  seat: { email: string; status: string; joined: boolean } | null;
  mayInvite: boolean;
  iAmThePartner: boolean;
};

export function PartnerSeat() {
  const { user, household, refreshHousehold } = useApp();
  const [state, setState] = useState<SeatState | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/seat", { cache: "no-store" });
      if (res.ok) return (await res.json()) as SeatState;
    } catch {
      // Nothing to show rather than an error on a settings page.
    }
    return null;
  }, []);

  useEffect(() => {
    let gone = false;
    load().then((seat) => {
      if (!gone && seat) setState(seat);
    });
    return () => {
      gone = true;
    };
  }, [load]);

  const invite = async () => {
    const wrong = invitationProblem(email, user?.email ?? null);
    if (wrong) {
      setProblem(wrong);
      return;
    }
    setProblem(null);
    setBusy(true);
    try {
      const res = await fetch("/api/seat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProblem(data.error ?? "That did not work. Please try again.");
        return;
      }
      setNote(
        data.sent
          ? `The invitation is on its way to ${data.seat.email}. They can sign in whenever they like.`
          : `The seat is saved for ${data.seat.email}, but the email could not be sent. Mwata can see that and will follow it up.`,
      );
      setEmail("");
      setState(await load());
      await refreshHousehold();
    } finally {
      setBusy(false);
    }
  };

  if (!state || (!state.mayInvite && !state.iAmThePartner && !state.seat)) return null;

  if (state.iAmThePartner) {
    return (
      <div className="mt-8 border-t border-line pt-8">
        <h2 className="text-xl font-semibold text-pine">Your seat</h2>
        <p className="mt-1 text-sm text-stone">
          You are here on the seat that comes with {household.otherName ? `${household.otherName}'s` : "another"}{" "}
          purchase. Your answers are your own, and so is your AI partner. The pages you fill in together are the
          money, the research and the plan.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-line pt-8">
      <h2 className="text-xl font-semibold text-pine">Your partner seat</h2>
      {state.seat ? (
        <>
          <p className="mt-1 text-sm text-stone">
            The seat is with <strong className="text-pine">{state.seat.email}</strong>
            {state.seat.joined ? ", and they have signed in." : ". They have not signed in yet."}
          </p>
          <p className="mt-3 text-sm text-stone">
            One seat comes with the course, and it stays with that address. If it has to change, send me an email and I
            will move it.
          </p>
          {!state.seat.joined && (
            <p className="mt-3 flex justify-center">
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { setEmail(state.seat!.email); invite(); }}>
                {busy ? "Sending…" : "Send the invitation again"}
              </button>
            </p>
          )}
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-stone">
            Your purchase comes with one seat for the person you are planning this with. They sign in with their own
            address and keep their own answers and their own AI partner. The money, the research and the plan you fill
            in together; the pages about what you each want, you each answer yourself.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="partner-email">
              Their email address
            </label>
            <input
              id="partner-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2"
              placeholder="their email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="button" className="btn btn-primary" disabled={busy || !email.trim()} onClick={invite}>
              {busy ? "Sending…" : "Send the invitation"}
            </button>
          </div>
          <p className="mt-2 text-xs text-stone">
            Once it is sent, the seat stays with that address. Changing it later is an email to me.
          </p>
        </>
      )}
      {problem && <p className="mt-3 rounded-lg bg-ochre-soft p-3 text-sm">{problem}</p>}
      {note && <p className="mt-3 rounded-lg bg-success-soft p-3 text-sm">{note}</p>}
    </div>
  );
}
