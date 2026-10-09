"use client";
// Calm, colored content cards (example, tips, story, challenge, sources).
import { useState } from "react";

/*
 * Ochre is the brand's one accent: about one ochre moment per screen. So it
 * marks only what needs attention — "Watch out" and "A friendly challenge" —
 * while the calm boxes stay Pine on Sage or white.
 */
const tones = {
  example: { box: "bg-white border border-line", title: "text-pine" },
  tips: { box: "bg-white border-l-4 border-moss", title: "text-pine" },
  story: { box: "bg-sage", title: "text-pine" },
  challenge: { box: "bg-white border-l-4 border-ochre", title: "text-ochre" },
  watch: { box: "bg-ochre-soft", title: "text-ochre" },
  talk: { box: "bg-pine text-sand", title: "text-ochre-light" },
  // Step 2: official sources, expert work, and "Can you skip this part?".
  sources: { box: "bg-white border-l-4 border-pine", title: "text-pine" },
  expert: { box: "bg-white border-2 border-pine/40", title: "text-pine" },
  skip: { box: "bg-sand border border-line", title: "text-stone" },
  // Step 3: what this check means for somebody building the life they want
  // where they already are. Calm, not a warning: staying is a real choice.
  staying: { box: "bg-sage border-l-4 border-pine", title: "text-pine" },
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
