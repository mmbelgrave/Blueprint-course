import Link from "next/link";
import { journey } from "@/lib/content";
import { buyUrl } from "@/lib/modules-app";

/**
 * A step that is shut, for one of two reasons: it is not written yet, or it is
 * part of the course and this person has not bought it. The two read very
 * differently to the person in front of them, so they are never muddled.
 *
 * Nobody's answers are touched either way: a step opens again by itself when
 * it is released, or when the purchase arrives.
 */
export function ClosedStep({ step, why = "not-released" }: { step: number; why?: "not-released" | "not-bought" }) {
  const s = journey.steps.find((x) => x.number === step);
  const name = `Step ${step}${s ? ` · ${s.title}` : ""}`;

  if (why === "not-bought") {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 text-center">
        <h1 className="text-2xl text-pine">{name} is part of the course</h1>
        <p>{s?.question ? `${s.question} ` : ""}Get Phase 1 to open it, with its video and its workbook.</p>
        <p className="flex flex-col items-center gap-2">
          <a className="btn btn-primary" href={buyUrl} target="_blank" rel="noopener noreferrer">
            Get Phase 1
          </a>
          <Link href="/modules" className="btn btn-ghost">
            Back to the modules
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 text-center">
      <h1 className="text-2xl text-pine">{name} is not open yet</h1>
      <p>It is coming soon. You will find it here as soon as it opens.</p>
      <p>
        <Link href="/dashboard" className="btn btn-primary">
          Back to the overview
        </Link>
      </p>
    </div>
  );
}
