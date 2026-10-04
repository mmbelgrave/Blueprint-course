"use client";
// Friendly screen for an unexpected error (instead of the technical default).
// Kept simple on purpose: no menu, so it still works if the menu caused the error.
import Link from "next/link";
import { useEffect } from "react";
import { isStaleVersion, mayReload, RELOAD_KEY } from "@/lib/stale-version";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const stale = isStaleVersion(error);

  useEffect(() => {
    // The error name only — never page content or answers.
    console.error("page error:", error.name, error.digest ?? "");
    if (!stale) return;
    /*
     * A tab left open across a release is holding the old files. "Try again"
     * runs the same old code and fails again; loading the page afresh fetches
     * the new version. Done once a minute at most, so a page that is broken for
     * another reason cannot spin.
     */
    let last: number | null = null;
    try {
      const saved = sessionStorage.getItem(RELOAD_KEY);
      last = saved === null ? null : Number(saved);
    } catch {
      // Private browsing: no memory of earlier reloads, so fall through to one.
    }
    if (!mayReload(Date.now(), last)) return;
    try {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      // Nothing to remember it with; the reload below still happens once.
    }
    window.location.reload();
  }, [error, stale]);

  // Shown only if the reload above was held back (one a minute), so the person
  // always has a way through rather than a dead screen.
  if (stale) {
    return (
      <main className="mx-auto max-w-md flex-1 space-y-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-pine">A newer version is ready</h1>
        <p>Your answers are safe. Load the page again to carry on.</p>
        <div className="flex justify-center gap-3">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Load the new version
          </button>
          <Link href="/dashboard" className="btn btn-ghost">
            Overview
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md flex-1 space-y-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-pine">Something went wrong</h1>
      <p>Your answers are safe. Please try again. If it keeps happening, go back to the overview.</p>
      <div className="flex justify-center gap-3">
        <button className="btn btn-primary" onClick={() => retry()}>
          Try again
        </button>
        <Link href="/dashboard" className="btn btn-ghost">
          Overview
        </Link>
      </div>
    </main>
  );
}
