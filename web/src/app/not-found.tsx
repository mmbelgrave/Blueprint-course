// Friendly "page not found" (for example an old or mistyped link).
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md flex-1 space-y-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-indigo">This page does not exist</h1>
      <p>The link may be old or mistyped. Your answers are safe.</p>
      <Link href="/dashboard" className="btn btn-primary">
        Go to the overview
      </Link>
    </main>
  );
}
