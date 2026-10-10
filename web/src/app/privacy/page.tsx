import { Shell } from "@/components/Shell";

/*
 * The app's own privacy text, written for anyone who signs up — not for an
 * invited pilot. The company, the contact address and the tone follow the
 * privacy note on the website (My Purpose/Website/privacy.html), so the two
 * never say different things. The website note covers the business as a whole;
 * this page covers what the app itself stores.
 */
export default function Privacy() {
  return (
    <Shell>
      <article className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-pine">Your privacy</h1>
        <p className="text-stone">
          Here is exactly what happens with what you write in this app.
        </p>

        <h2 className="font-semibold">Who is responsible</h2>
        <p>
          The Life You Choose is a brand of <strong>Belgrave Management, Unipessoal Lda</strong>, a company
          registered in Portugal, registration and tax number (NIPC) 518428338. The company is responsible for your
          personal data &mdash; in legal terms, the &ldquo;controller&rdquo;. Mwata runs it. Questions about your
          data:{" "}
          <a href="mailto:info@maderealblueprint.com" className="text-pine underline">
            info@maderealblueprint.com
          </a>
          .
        </p>

        <h2 className="font-semibold">What we store</h2>
        <p>
          Your email address, your first name, your answers, the pictures you add to your board, your chats with your
          AI partner, the short notes your AI partner keeps about your answers, your feedback on each part and on
          each page, and any question you send from the Help page.
        </p>

        <h2 className="font-semibold">Who reads it</h2>
        <p>
          Your AI partner reads your answers to help you think. Mwata can read your answers only if you ticked that
          box &mdash; you can untick it at any time under Settings. Nobody else reads them.
        </p>

        <h2 className="font-semibold">Your pictures</h2>
        <p>
          The pictures you add in 1.2 are kept in your own folder, which only you can open. Nobody can reach them with
          a plain link. Your AI partner never sees a picture: it reads only the line you write under it.
        </p>

        <h2 className="font-semibold">When you ask a question</h2>
        <p>
          A question you send from <strong>Help</strong> is stored with your name and email, and emailed to Mwata so he
          can answer it. He answers by email. Your
          answers are not attached to it.
        </p>

        <h2 className="font-semibold">Please keep the sensitive things out</h2>
        <p>
          The exercises ask about your life, so write honestly &mdash; but please leave out health details, anything
          about someone else&rsquo;s health, and anything a court would call sensitive. The app does not need them,
          and the fewer of them it holds the better protected you are. Nothing stops you writing them; this is a
          request, not a filter.
        </p>

        <h2 className="font-semibold">The help we use</h2>
        <p>
          Five companies help run this app. <strong>Supabase</strong> stores your account and your answers in a
          database in the European Union. <strong>Anthropic</strong> runs the AI model (Claude) that your AI partner
          uses: it is in the United States, it does not use what you write to train its models, and it deletes what it
          receives within 30 days. <strong>Vercel</strong> runs the app itself. <strong>Resend</strong> delivers the
          emails: your sign-in code, and the questions you send from Help. <strong>Lemon Squeezy</strong> takes the
          payment if you buy, and holds the order.
        </p>

        <h2 className="font-semibold">How long</h2>
        <p>
          As long as you use the Blueprint. If you have not signed in for <strong>24 months</strong>, we email you
          first; if there is no reply within 30 days, the account and everything in it are deleted. Sign-in codes last
          an hour. The log of how much you used your AI partner is kept for 12 months, and questions you send from
          Help for 12 months after we last spoke. An order has to be kept as long as tax law says, which is generally
          10 years &mdash; so after you delete your account the order record is all that is left. Backups may hold
          deleted data for up to 7 days.
        </p>

        <h2 className="font-semibold">Deleting</h2>
        <p>
          Go to <strong>What my AI partner knows</strong> and choose <strong>Delete everything</strong>. Your answers,
          your pictures, your chats, the notes, your questions and your account are gone at once. You can also make your AI partner
          forget one single topic and keep the rest.
        </p>

        <h2 className="font-semibold">Your rights</h2>
        <p>
          You may ask what is stored about you, ask for a copy, ask for a correction, or ask for all of it to be
          deleted. Write to{" "}
          <a href="mailto:info@maderealblueprint.com" className="text-pine underline">
            info@maderealblueprint.com
          </a>
          .
        </p>
      </article>
    </Shell>
  );
}
