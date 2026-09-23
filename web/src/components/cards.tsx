"use client";
// Calm, colored content cards (example, tips, story, challenge, freedom idea).
import { useState } from "react";

const tones = {
  example: { box: "bg-indigo-soft", title: "text-indigo" },
  tips: { box: "bg-white border border-sand-deep", title: "text-amber" },
  story: { box: "bg-amber-soft", title: "text-amber" },
  challenge: { box: "bg-white border-l-4 border-amber", title: "text-amber" },
  freedom: { box: "bg-green-soft", title: "text-green" },
  talk: { box: "bg-indigo text-white", title: "text-amber-soft" },
  // Step 2: official sources, expert work, and "Can you skip this part?".
  sources: { box: "bg-white border-l-4 border-indigo", title: "text-indigo" },
  expert: { box: "bg-white border-2 border-indigo/40", title: "text-indigo" },
  skip: { box: "bg-sand border border-sand-deep", title: "text-muted" },
} as const;

export function Card({
  tone,
  title,
  children,
  collapsible = true,
  defaultOpen = false,
}: {
  tone: keyof typeof tones;
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || !collapsible);
  const t = tones[tone];
  return (
    <section className={`rounded-2xl p-5 ${t.box}`}>
      {collapsible ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={`flex w-full items-center justify-between text-left font-semibold ${t.title}`}
        >
          {title}
          <span aria-hidden className={`transition ${open ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>
      ) : (
        <h3 className={`font-semibold ${t.title}`}>{title}</h3>
      )}
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </section>
  );
}
