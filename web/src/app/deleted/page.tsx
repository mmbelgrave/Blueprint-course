"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Shell } from "@/components/Shell";

function Message() {
  const accountDeleted = useSearchParams().get("account") === "1";
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl bg-white p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-indigo">Everything is deleted</h1>
      <p>Your answers, your chats, what your AI partner knew about you, your results and your feedback are gone.</p>
      {accountDeleted ? (
        <p>Your account is deleted too.</p>
      ) : (
        <p>
          Your email address is still registered for signing in. If you want that removed as well, please ask
          Mwata.
        </p>
      )}
      <Link href="/" className="btn btn-ghost">
        Back to the start
      </Link>
    </div>
  );
}

export default function Deleted() {
  return (
    <Shell>
      <Suspense>
        <Message />
      </Suspense>
    </Shell>
  );
}
