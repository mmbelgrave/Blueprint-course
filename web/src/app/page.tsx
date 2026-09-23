"use client";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { PRODUCT, steps } from "@/lib/content";

export default function Welcome() {
  const { user } = useApp();
  const first = steps[0].step;

  return (
    <Shell>
      <section className="py-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber">{PRODUCT.brand}</p>
        <h1 className="mt-2 text-4xl font-bold text-indigo sm:text-5xl">{first.question}</h1>
        <div className="mt-4 text-xl text-indigo">
          {first.tagline.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
        <div className="mt-6 max-w-2xl space-y-4 text-lg">
          {first.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <Link href={user ? "/dashboard" : "/signin"} className="btn btn-primary mt-8 text-lg">
          {user ? "Continue" : "Start"}
        </Link>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {PRODUCT.name} · {PRODUCT.edition}
        </h2>
        <ol className="mt-3 grid gap-4 sm:grid-cols-2">
          {steps.map(({ step }) => (
            <li key={step.id} className="rounded-2xl bg-white p-5">
              <p className="text-sm font-semibold text-amber">Step {step.number}</p>
              <p className="text-xl font-semibold text-indigo">{step.title}</p>
              <p className="mt-1">{step.question}</p>
            </li>
          ))}
        </ol>
      </section>
    </Shell>
  );
}
