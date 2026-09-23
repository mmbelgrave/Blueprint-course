import { Shell } from "@/components/Shell";

// Pilot text: plain and true. Mwata can add a company name and a contact
// address here when the Blueprint opens to more people.
export default function Privacy() {
  return (
    <Shell>
      <article className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-indigo">Your privacy</h1>
        <p className="text-muted">
          This is a small pilot. You were invited by name. Here is exactly what happens
          with what you write.
        </p>

        <h2 className="font-semibold">What we store</h2>
        <p>
          Your email address, your first name, your answers, your chats with your AI
          partner, the short notes your AI partner keeps about your answers, and your
          feedback on each part.
        </p>

        <h2 className="font-semibold">Who reads it</h2>
        <p>
          Your AI partner reads your answers to help you think. Mwata can read your
          answers only if you ticked that box &mdash; you can untick it at any time under
          Settings. Nobody else reads them.
        </p>

        <h2 className="font-semibold">The help we use</h2>
        <p>
          Two companies help run this app. <strong>Supabase</strong> stores your account
          and your answers in a database in the European Union.{" "}
          <strong>Anthropic</strong> runs the AI model (Claude) that your AI partner
          uses. Anthropic does not use what you write to train its models.
        </p>

        <h2 className="font-semibold">How long</h2>
        <p>
          As long as you use the Blueprint. When the pilot ends you may keep your account,
          or delete it. If you stop and do nothing, your account stays until you ask for it
          to go.
        </p>

        <h2 className="font-semibold">Deleting</h2>
        <p>
          Go to <strong>What my AI partner knows</strong> and choose{" "}
          <strong>Delete everything</strong>. Your answers, your chats, the notes and your
          account are gone at once. You can also make your AI partner forget one single
          topic and keep the rest.
        </p>

        <h2 className="font-semibold">Your rights</h2>
        <p>
          You may ask what is stored about you, ask for a copy, ask for a correction, or
          ask for all of it to be deleted. Simply reply to the email that invited you.
        </p>
      </article>
    </Shell>
  );
}
