"use client";
// "Read this first": everything that is the same in every step, said once, so
// no step overview has to repeat it.
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Bullets, InfoTable } from "@/components/text";
import { appGuide, PRODUCT } from "@/lib/content";

export default function HowItWorks() {
  return (
    <Shell>
      <article className="mx-auto max-w-2xl space-y-6">
        <header>
          <p className="text-sm font-semibold tracking-wide text-ochre">
            {PRODUCT.name} · {PRODUCT.edition}
          </p>
          <h1 className="mt-1 text-3xl text-pine">{appGuide.title}</h1>
          <p className="mt-2 text-lg">{appGuide.intro}</p>
        </header>

        {appGuide.sections.map((s) => (
          <section key={s.id} className="space-y-3 rounded-2xl bg-white p-5 sm:p-6">
            <h2 className="text-xl text-pine">{s.title}</h2>
            {s.bullets && <Bullets items={s.bullets} />}
            {s.rows && <InfoTable rows={s.rows} />}
          </section>
        ))}

        <p className="rounded-2xl border border-line p-4 text-stone">
          <span className="font-semibold text-ochre">Good to know: </span>
          {appGuide.closing}
        </p>

        <p className="text-center">
          <Link href="/dashboard" className="btn btn-ghost">
            Back to the overview
          </Link>
        </p>
      </article>
    </Shell>
  );
}
