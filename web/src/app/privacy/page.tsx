import { Shell } from "@/components/Shell";

// PLACEHOLDER — Mwata reviews and writes the real legal text.
export default function Privacy() {
  return (
    <Shell>
      <article className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-6 sm:p-8">
        <p className="rounded-lg bg-amber-soft p-3 text-sm">
          Placeholder text. The final privacy text will be reviewed before the app is shared.
        </p>
        <h1 className="text-2xl font-bold text-indigo">Your privacy</h1>
        <h2 className="font-semibold">What we store</h2>
        <p>Your email, first name, your answers, your chats with the AI partner, a short summary of what you wrote, and your feedback.</p>
        <h2 className="font-semibold">Who reads it</h2>
        <p>An AI model reads your answers to help you think. Mwata can read your answers only if you said yes to that. Nobody else.</p>
        <h2 className="font-semibold">Where it is stored</h2>
        <p>In a secure database in the European Union. Only you can read your own answers.</p>
        <h2 className="font-semibold">Deleting</h2>
        <p>You can delete everything at any time. Then your answers, chats and account are gone.</p>
      </article>
    </Shell>
  );
}
