import Link from "next/link";
import { Shell } from "@/components/Shell";

/*
 * The app's privacy page.
 *
 * This is section D3 of the lawyer's "Legal text to paste" of 18 October,
 * word for word, with the five additions Mwata asked for on 19 October: the
 * date, the registry details and share capital, the plain line that nobody
 * reads your answers but you, a sentence on what is required and what is
 * optional, and a line saying the AI makes no decisions about anybody. The
 * backups sentence is the Free-plan one, which is Mwata's choice of
 * 19 October: there are no separate backups.
 *
 * Two words differ from the lawyer's text because the app differs: the
 * consent screen has two boxes rather than one, so the sensitive-data
 * paragraph points at the second box.
 *
 * The five blocks for Block B were approved by the lawyer on 24 October, with
 * his own additions: the sentence about either partner switching the AI
 * partner off, and the two sentences about asking for something to be removed
 * from a shared page. They are published here as approved.
 *
 * Nothing on this page is changed without the lawyer seeing it. The website
 * note at maderealblueprint.com/privacy.html covers the business as a whole;
 * this page covers the app.
 */
export const metadata = { title: "Your privacy" };

const UPDATED = "24 October 2026";

export default function Privacy() {
  return (
    <Shell>
      <article className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-pine">Your privacy</h1>
        <p className="text-sm text-stone">Last updated: {UPDATED}</p>
        <p className="text-stone">Here is exactly what happens with what you write in this app.</p>

        <h2 className="font-semibold">Who is responsible</h2>
        <p>
          The Life You Choose is a brand of <strong>Belgrave Management, Unipessoal Lda</strong>, a company
          registered in Portugal. Company registration and tax number (NIPC): 518428338, registered in the Commercial
          Registry (Conservatória do Registo Comercial). Share capital: €10,000. Registered office: Rua Doutora Maria
          Adelaide Moura Ferreira, s/n, Passarela, 6290-093 Lagarinhos, Gouveia, Portugal. The company is responsible
          for your personal data (in legal terms, the &ldquo;controller&rdquo;). Mwata runs it. Questions about your
          data:{" "}
          <a href="mailto:info@maderealblueprint.com" className="text-pine underline">
            info@maderealblueprint.com
          </a>
          . The full privacy note is at{" "}
          <a href="https://maderealblueprint.com/privacy.html" className="text-pine underline">
            maderealblueprint.com/privacy.html
          </a>
          .
        </p>

        <h2 className="font-semibold">What we store, and why</h2>
        <p>
          Your email address, your first name, your answers, the pictures you add to your board, your chats with your
          AI partner, the short notes your AI partner keeps about your answers, your feedback on each part and on each
          page, and any question you send from the Help page. We use this to run the app for you, remember your
          progress and let you print or save your results. The legal basis is our contract with you (Art. 6(1)(b)
          GDPR). Your sign-in code also rests on our legitimate interest in keeping accounts secure (Art. 6(1)(f)
          GDPR). Your AI partner: your consent (Art. 6(1)(a) GDPR). The log of how much you used it: our legitimate
          interest in the daily limit and the costs (Art. 6(1)(f) GDPR). Order records: a legal obligation (Art.
          6(1)(c) GDPR).
        </p>
        <p>
          Only your email address is required, because it is how you sign in. Your first name and your currency make
          the app read better, and everything else is what you choose to write in the exercises. Leave any of it out
          and the app still works.
        </p>

        <h2 className="font-semibold">Your AI partner</h2>
        <p>
          The AI partner is optional and stays off until you switch it on. Before your first chat we ask you to tick a
          separate box to agree that what you write is sent to Anthropic, our AI provider, in the United States.
          Without that consent nothing is sent. You can withdraw it at any time in Settings. Withdrawing does not
          affect what was done before. The AI partner is an artificial intelligence, not a person, and it can be
          wrong. It reads your answers and keeps short notes to help you in later steps. It never sees a picture: it
          reads only the line you write under it. You can read, correct and delete its notes under{" "}
          <Link href="/me" className="text-pine underline">
            What my AI partner knows
          </Link>
          .
        </p>
        <p>
          Your AI partner makes no decisions about you. Nothing it writes has any legal effect, nothing about your
          account is decided automatically, and it gives no legal, tax, immigration, medical or financial advice.
        </p>
        <p>
          If you share the course with a partner, some pages are answered together. Your AI partner only reads those
          pages, and only keeps notes about them, if both of you have switched your AI partner on. Until then it stays
          out of them, and your own pages are not affected. A note made from a page you answered together is shown to
          both of you, and either of you can delete it, which deletes it for both. Each of you gives your own
          agreement; neither of you can give it for the other. If either of you switches your AI partner off, it stops
          using the pages you answered together, and the notes made from them are deleted for both of you.
        </p>

        <h2 className="font-semibold">Who reads it</h2>
        <p>
          Nobody reads your answers but you. Your AI partner reads them only if you switch it on, and you can switch
          it off again at any time. Mwata cannot read them at all: the app has no way to show him what you wrote.
          What he does see is how far people have come and the feedback they send him, with no answers in it.
        </p>

        <h2 className="font-semibold">If you share the course with a partner</h2>
        <p>
          One purchase comes with one seat, for the person you are planning this with. Each of you has your own
          account, your own answers and your own AI partner. The pages you answer together are stored once, with the
          person who bought the course, and either of you can read and change them. The pages you each answer alone
          are yours; your partner sees them only once you have both written, and three of them you can keep private
          for good.
        </p>
        <p>
          The invitation email tells your partner what we store before they sign in. We use their address for the
          invitation and for their sign-in codes, and for nothing else. An invitation nobody uses is deleted after 30
          days, and so is the address.
        </p>
        <p>
          If the purchase ends, by withdrawal, refund, or because the buyer deletes their account, the seat ends too.
          We email the partner the same day with the date and how to download their answers, and their own answers are
          deleted 30 days later. The pages the two of them answered together stay with the buyer, without the
          partner&rsquo;s name on them. If the buyer deletes their answers or their account, the shared answers are
          deleted for the partner as well, and the screen says so before they press the button. If the partner deletes
          their account, the seat closes and their own answers go with it. If a page you answered together contains
          something about you that you want removed,{" "}
          <Link href="/help?topic=my-data" className="text-pine underline">
            ask me
          </Link>{" "}
          and I will remove it, unless there is a reason not to. I am responsible for both accounts.
        </p>
        <p>
          If your partner&rsquo;s account is closed because they have not signed in for 24 months, the seat closes. We
          email you when that happens, and you can invite your partner again. Your own three years of access are not
          affected.
        </p>

        <h2 className="font-semibold">Please keep the sensitive things out</h2>
        <p>
          The exercises ask about your life, so write honestly. Please avoid details about health, religion, sexual
          orientation or political opinions, unless you want them in your answers. If you choose to write them, the
          app stores them with your answers. We ask you once, on your first screen, whether you agree to that, and you
          can give or take back that agreement at any time in Settings. It is optional, and the app works the same
          without it. If you switch your AI partner on, a second, separate box asks whether such details may also go
          to the AI model. Both are your explicit consent (Art. 9(2)(a) GDPR). The app does not check what you type.
          You can delete what your AI partner has made of it under What my AI partner knows.
        </p>

        <h2 className="font-semibold">Your pictures</h2>
        <p>
          The pictures you add in 1.2 are kept in a private folder that only you can open. Nobody can reach them with
          a plain link.
        </p>

        <h2 className="font-semibold">When you ask a question</h2>
        <p>
          A question you send from Help is stored with your name and email, and emailed to Mwata so he can answer it.
          He answers by email. Your answers are not attached to it.
        </p>

        <h2 className="font-semibold">The help we use</h2>
        <p>
          Supabase stores your account and your answers in a database in the European Union (Ireland). Supabase is a
          United States company, and its support staff outside the EU could have access in limited cases. Anthropic
          runs the AI model (Claude) behind your AI partner. It is in the United States, it does not use what you
          write to train its models, and it deletes what it receives within 30 days, unless the law requires it, or a
          message is flagged for misuse. Vercel, a United States company, runs the app, receives your IP address and
          keeps short technical logs for security. Resend delivers your sign-in code and the questions you send from
          Help. Lemon Squeezy takes the payment if you buy, and holds the order. Anthropic, Vercel, Resend and Lemon
          Squeezy are in the United States. Your data is protected there by the EU-US Data Privacy Framework, the
          standard contractual clauses approved by the European Commission, or both. The privacy note on our website
          gives the details.
        </p>
        <p>
          If you tick the box for occasional updates, your email address is also stored by MailerLite, which sends
          them. You can stop at any time with the unsubscribe link.
        </p>

        <h2 className="font-semibold">What the app stores in your browser</h2>
        <p>
          The app does not use advertising or tracking cookies. It stores only what it needs: a session so you stay
          signed in, your choice of light or dark appearance, and the exercise you last opened so you can pick up
          where you stopped. None of it is used for advertising or tracking.
        </p>

        <h2 className="font-semibold">How long</h2>
        <p>
          As long as you use the Blueprint. If you do not sign in for 24 months, I email you first, and send one
          short reminder seven days before the deletion. If there is no reply within 30 days I delete the account. If
          you bought the course, this applies only once three years have passed since your purchase. Sign-in codes
          last an hour. Your chats with your AI partner are kept for 12 months from the day you write them, then
          deleted automatically. The notes your AI partner keeps stay until you delete them. If you switch your AI
          partner off, we ask you whether to delete your chats and notes at once or keep them switched off. If you
          keep them, they are deleted 12 months after you switched it off. The log of how much you used your AI
          partner is kept for 12 months, and questions you send from Help for 12 months from the day you send them. An order
          has to be kept as long as tax law says, which is generally 10 years, so after you delete your account the
          order record is all that is left. A record that you gave or withdrew consent, with only the date and the
          wording version, is kept for 3 years after your last choice or after you delete your account. The basis is
          my legitimate interest in being able to show that I asked properly (Art. 6(1)(f) GDPR). There are no
          separate backups of the app&rsquo;s database.
        </p>
        <p>
          If you withdraw from your purchase, your access ends three days later and your answers are deleted 30 days
          after that, or sooner if you ask us. The record of the withdrawal itself and the order stay, because we have
          to be able to show what was asked for and what was refunded.
        </p>

        <h2 className="font-semibold">Deleting</h2>
        <p>
          Go to{" "}
          <Link href="/me" className="text-pine underline">
            What my AI partner knows
          </Link>{" "}
          and choose Delete everything I wrote. Your answers, your pictures, your chats, the notes, your questions
          and your progress are gone at once. Your sign-in account and what you have bought stay, so you can start
          again, unless you also tick &ldquo;Delete my account as well&rdquo;, which closes the account and ends your
          access to what you bought. Either way the order record and the withdrawal record stay, for the reasons in
          &ldquo;How long&rdquo; above. You can also make your AI partner forget one single topic and keep the rest.
        </p>

        <h2 className="font-semibold">Your rights</h2>
        <p>
          You may ask what is stored about you, ask for a copy in a common file format, ask for a correction, ask for
          all of it to be deleted, ask us to limit how we use it, or object to it. You can withdraw any consent at any
          time. You can object at any time to processing based on our legitimate interest, which here is the security
          of your sign-in and the AI usage log. Write to{" "}
          <a href="mailto:info@maderealblueprint.com" className="text-pine underline">
            info@maderealblueprint.com
          </a>
          . We answer within one month. If you are not happy, please tell us first. You can also complain to the
          Portuguese data protection authority, the Comissão Nacional de Proteção de Dados (CNPD),{" "}
          <a href="https://www.cnpd.pt" className="text-pine underline">
            www.cnpd.pt
          </a>
          , or to the authority in the EU country where you live.
        </p>

        <p className="border-t border-line pt-4 text-sm text-stone">
          You can also{" "}
          <Link href="/withdraw" className="text-pine underline">
            withdraw from contract here
          </Link>
          , without signing in.
        </p>
      </article>
    </Shell>
  );
}
