"use client";
// Friendly screen for an unexpected error (instead of the technical default).
// Kept simple on purpose: no menu, so it still works if the menu caused the error.
import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // The error name only — never page content or answers.
    console.error("page error:", error.name, error.digest ?? "");
  }, [error]);

  return (
    <main className="mx-auto max-w-md flex-1 space-y-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-indigo">Something went wrong</h1>
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
