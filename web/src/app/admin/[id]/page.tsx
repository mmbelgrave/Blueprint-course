"use client";
// One participant's answers and AI notes, read-only (brief 4.7).
// The server only sends them when this person gave consent.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RequireUser, Shell } from "@/components/Shell";

type Detail = {
  name: string;
  workbook: { step: string; parts: { part: string; pages: { title: string; text: string }[] }[] }[];
  notes: { label: string; value: string | string[] }[];
  notesUpdated: string | null;
};

function ParticipantDetail({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/participants/${encodeURIComponent(id)}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        if (!cancelled) setData(body);
      })
      .catch((e) => !cancelled && setError((e as Error).message || "Could not load this person."));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <Link href="/admin" className="text-sm text-indigo underline">
        ← Back to the overview
      </Link>
      {error ? (
        <p className="mt-4 rounded-lg bg-sand p-4">{error}</p>
      ) : !data ? (
        <p className="mt-4 text-muted">One moment…</p>
      ) : (
        <>
          <h1 className="mt-3 text-3xl font-bold text-indigo">{data.name || "(no name yet)"}</h1>
          <p className="mt-1 text-sm text-muted">Read-only. This person agreed that you may read their answers.</p>

          <section className="mt-6 space-y-3 rounded-2xl bg-white p-5">
            <h2 className="text-xl font-semibold text-indigo">What their AI partner knows</h2>
            {data.notes.length === 0 ? (
              <p className="text-muted">No notes yet.</p>
            ) : (
              <dl className="space-y-2">
                {data.notes.map((n) => (
                  <div key={n.label}>
                    <dt className="text-sm font-semibold">{n.label}</dt>
                    <dd className="whitespace-pre-line">{Array.isArray(n.value) ? n.value.join(" · ") : n.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          {data.workbook.every((s) => s.parts.length === 0) && (
            <p className="mt-6 text-muted">No answers yet.</p>
          )}
          {data.workbook.map((s) =>
            s.parts.length ? (
              <section key={s.step} className="mt-8 space-y-4">
                <h2 className="text-2xl font-semibold text-indigo">{s.step}</h2>
                {s.parts.map((p) => (
                  <div key={p.part} className="space-y-3 rounded-2xl bg-white p-5">
                    <h3 className="font-semibold text-amber">{p.part}</h3>
                    {p.pages.map((pg) => (
                      <div key={pg.title}>
                        <p className="font-semibold">{pg.title}</p>
                        <p className="mt-1 whitespace-pre-line text-sm">{pg.text}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            ) : null,
          )}
        </>
      )}
    </>
  );
}

export default function AdminParticipantPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Shell>
      <RequireUser>
        <ParticipantDetail id={id} />
      </RequireUser>
    </Shell>
  );
}
