import Link from "next/link";
import { Shell } from "@/components/Shell";
import { steps } from "@/lib/content";

// "About the Freedom idea" (appendix of the workbook). Shown as content only;
// the AI partner never brings it up on its own.
export default function FreedomIdea() {
  // The appendix is the same in every workbook.
  const a = steps[0].freedom_appendix;
  return (
    <Shell>
      <article className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-green">{a.title}</h1>
        <p>{a.text}</p>
        {a.link && (
          <a href={a.link} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            Freedom Academy
          </a>
        )}
        <p className="rounded-lg bg-sand p-3">
          <span className="font-semibold">Honest note: </span>
          {a.honest_note}
        </p>
        <p className="rounded-lg border-l-4 border-amber bg-amber-soft p-3">
          <span className="font-semibold">Please remember: </span>
          {a.risk_note}
        </p>
        <Link href="/dashboard" className="text-sm text-muted underline">
          Back to the overview
        </Link>
      </article>
    </Shell>
  );
}
