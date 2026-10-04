import Link from "next/link";
import { journey } from "@/lib/content";

/**
 * A step that is not open yet. Reached by typing the address or following an
 * old link, because the overview does not link to it. Nobody's answers are
 * touched: the step opens again by itself when its content is released.
 */
export function ClosedStep({ step }: { step: number }) {
  const s = journey.steps.find((x) => x.number === step);
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 text-center">
      <h1 className="text-2xl text-pine">
        Step {step}
        {s ? ` · ${s.title}` : ""} is not open yet
      </h1>
      <p>{s?.note === "opens soon" ? "It is nearly ready. You will find it here as soon as it opens." : "This step is still being written. You will find it here when it is ready."}</p>
      <p>
        <Link href="/dashboard" className="btn btn-primary">
          Back to the overview
        </Link>
      </p>
    </div>
  );
}
