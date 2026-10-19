# What was built in the app, against your text of 18 October

For Belgrave Management, Unipessoal Lda. Written 19 October 2026.

Your "Legal text to paste (18 Oct 2026)" is the source. Sections D1, D2 and D3
are now built, with your words where you gave words. This note lists the places
where the app deliberately says something different, and why, so you can tell
us which of them to change back.

All of it is live in the app as of 19 October 2026. The three accounts that
had consented under the old sign-up wording are being asked again: their old
consent does not count, and until they answer the new screen, nothing they
write is sent to Anthropic.

Your sections A2 and C2 are done too, as of 19 October: Terms §9 now points
to the withdrawal page and says access ends three days after we receive the
notice, and "Withdraw from contract" is in the footer of every page. The
backups row in the website privacy note said deleted data could sit in a
provider's backup for seven days, which contradicted the app, and now says
there are none.

---

## 1. What is built

**D1, the withdrawal page.** At app.maderealblueprint.com/withdraw, working
without signing in. Your title and intro sentence, word for word. Three fields:
the email address (required), the order number (optional), the name (optional).
One button, "Confirm withdrawal". No reason field, no sign-in, no extra screens.
Linked from the app footer, the sign-in page and Settings; the Terms and the
website footer are your sections A2 and C2 and are not ours to publish.

The request is always accepted. A missing or mistyped order number, or an
address we cannot find, does not stop it: the row is written and matched to the
order by email address afterwards, and anything unmatched is listed for Mwata
with "match this by hand" beside it. Instead of a CAPTCHA the page is rate
limited: one open request per address, five a day per address, thirty in ten
minutes from everybody.

Each withdrawal is recorded with the minute in UTC, the clock the person was
reading, their email, their name, the order number they typed, the order we
matched, the refund deadline (request plus 14 days) and the date their access
ends. No IP address.

The confirmation email goes out at once, with your subject, "We received your
withdrawal". A copy goes to info@maderealblueprint.com. If the money has not
gone back by day seven, the app emails Mwata again.

**D2, the AI consent.** A screen inside the AI panel, the first time somebody
opens it. Your label from D2, split into two boxes: the sentence about what is
sent to Anthropic, and the sentence about sensitive information. Both start
empty, and "Switch on my AI partner" stays dead until the first is ticked.
"Not now" is recorded too. The sign-up box is gone.

Every answer is written to an append-only table: the user id, the minute in
UTC, the version of the wording they read, and the value of each box.
Switching a tick off in Settings adds a row saying so rather than changing the
row that recorded the tick, and the database refuses an update. Change a word
in the wording and the version changes with it, so everybody is asked again
rather than being held to words they never saw. The same table records the
separate "Mwata may read my answers" tick, and the server checks that table
before any AI request and before any view of somebody's answers.

Your notice, in full, sits under the AI partner's name on every page: "You are
talking to an AI, not a person. It can be wrong, and it does not give legal,
tax, immigration, medical or financial advice."

**D3, the app privacy page.** Your text, word for word, with the additions in
section 2 below.

---

## 2. Where the app differs from your text, and why

1. **Access does not end at once.** Your D1 screen and email say "Your access
   to the app ends." The app ends it three days later, on a named date, and
   says so in both places. Mwata's decision: three days is a grace period for
   somebody who changes their mind, and nobody should lose what they have
   written the second they press a button. The refund is unaffected and always
   the full price. Three days, counted as calendar days, so the date is one
   anybody can count; the same three days are now in Terms §9, in the
   acknowledgement email, in the banner and on the app privacy page.
   **Please confirm the wording is acceptable.**

2. **Two consent boxes, not one.** Your D2 label covers the processing and the
   special categories in one sentence. It is split in two, with your words,
   because the second one is then a consent that can be refused on its own. The
   AI partner works with the first box alone. This also answers the question we
   asked you on 18 October.

3. **The page never refuses, and never comes down.** Your build note allows
   showing it permanently, which is what we do. A request outside the 14 days
   and outside the 30-day guarantee is still recorded and still answered; the
   person is told we will look at it and reply, rather than being turned away.

4. **The screen does not say whether the address matched a purchase.** Your D1
   screen text ends "Your access to the app ends", which would tell a stranger
   that the address they typed had bought something. On the public page the
   screen says only that the withdrawal is recorded and where the confirmation
   went. Everything about the purchase is in the email, which only the owner of
   that address can read. A signed-in person sees it all, because it is theirs.

5. **The privacy page carries five additions**, all Mwata's decisions of
   19 October:
   - the registry (Conservatória do Registo Comercial) and the share capital of
     €10,000, next to the NIPC and the registered office;
   - "Last updated: 19 October 2026";
   - a sentence saying only the email address is required and everything else
     is optional;
   - "Your AI partner makes no decisions about you. Nothing it writes has any
     legal effect, nothing about your account is decided automatically";
   - "nobody reads your answers but you" at the head of "Who reads it".

   Your backups placeholder is filled with the Free-plan sentence: "There are
   no separate backups of the app's database." That is Mwata's choice, and it
   is true today.

   One paragraph was added to "How long", because the withdrawal function
   creates a retention question your text does not cover: "If you withdraw from
   your purchase, your access ends three days later and your answers are
   deleted 30 days after that, or sooner if you ask us. The record of the
   withdrawal itself and the order stay, because we have to be able to show
   what was asked for and what was refunded." **Please confirm.**

6. **Two words in your D3 text changed to match the build.** The
   sensitive-data paragraph says "through the second box shown before your
   first AI chat" rather than "the separate box", because there are two.

---

## 3. Still open for you

1. **Does Art. 11a (introduced by Directive 2023/2673) apply to this digital
   course? What label and wording does Portugal's transposition require, and
   does the duty fall on us, Lemon Squeezy, or both?** The button is built
   either way, labelled "Withdraw from contract here".
2. **Is "access ends three days after the request" acceptable**, with the
   refund unaffected? See point 1 above.
3. **Does the withdrawal record have to outlive a deleted account?** It does:
   deleting an account now leaves the withdrawal row and the order row
   standing, with the person detached from them. The consent rows go with the
   account. If the consent history has to survive as proof, say so and we will
   keep it the same way.
4. Carried over and not yet closed: the conformity period in Terms §12 under
   Decreto-Lei 84/2021, and which consumer dispute entity is competent for this
   sector and district.

---

## 4. Your section E, where it stands

1. Share capital paid in: with the accountant. Not ours.
2. The four choices: made. Refunds are the full price in both windows; access
   ends three days after the request; there are no separate backups; consent is
   asked at first use.
3. The withdrawal page is finished and tested before the Terms are published.
4. Open and click tracking in Resend: checked on 19 October and off. Resend
   needs a tracking subdomain configured before it can track anything, and none
   is. So the sentence in your B2 can stand.
5. Dated copies of the old pages, and "Last updated" on each: the app page
   carries 19 October 2026. The website pages are Mwata's.
6. The folder of signed data processing agreements: Mwata's.

One technical note for your B-section, since you asked what the app stores in
the browser. The session cookie is set by Supabase with Path=/, SameSite=Lax
and a 400-day maximum age, and the app now adds Secure in production. It is not
HttpOnly, because the sign-in library in the browser reads the session itself;
that is how the library works, and it is the same for every app built on it.
There are no advertising or tracking cookies.
