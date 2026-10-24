# Terms: the partner seat, drafted for approval (not published)

The lawyer's note of 24 October asks for one sentence to be added to Terms
§6A:

> If your partner's account is closed for being inactive, the seat closes and
> you can invite your partner again.

**There is no §6A.** The published terms (version of 24 October 2026, on
maderealblueprint.com/terms.html and in the PDF attached to every purchase)
run 6. Your account and your answers, then 7. The AI partner. The partner
seat is not in the contract anywhere, although it is sold with Phase 1 and the
privacy note now describes it in detail.

So the sentence needs a section to live in. Below is that section, drafted
from wording the lawyer has already approved, with his sentence as the last
paragraph. Nothing is published: the terms are the contract, and a change
means a new dated version, a new PDF, and the website.

## Draft: 6A. The partner seat

One purchase comes with one seat, for the person you are planning this with.
You invite them in My settings, with their email address. The seat stays with
that address; if it has to change, email us.

Your partner signs in with their own email address and keeps their own
account, their own answers and their own AI partner. Some pages are answered
together: either of you can read and change those, and they are stored with
you, the buyer. The pages you each answer alone stay with the person who wrote
them, and your partner sees yours only once you have both written. Three of
those pages can be kept private for good.

An invitation that is not used within 30 days expires, and we delete it. You
can then invite somebody again.

Your partner's access follows your purchase. If your purchase ends, by
withdrawal, refund, or because you delete your account, the seat ends with it.
We write to your partner the same day, tell them the date, and explain how to
download their answers, which we delete 30 days later. The pages the two of
you answered together stay with you, without your partner's name on them.

If your partner's account is closed for being inactive, the seat closes and
you can invite your partner again.

## Two other things in the terms that the app has now outgrown

1. **§7, the bullet about special categories.** It says the explicit consent
   is given through "the second box on the consent screen before your first
   chat". Since item B1 the app asks on the first screen, for everybody,
   whether or not they ever use the AI partner, and the box before the first
   chat is now the second of two consents. The privacy page was updated to
   match; this bullet was not. Suggested wording, for the lawyer:

   > Please do not write details about other people that they would not want
   > shared. Please also avoid details about health, religion, sexual
   > orientation or political opinions unless you want them in your answers.
   > If you choose to write them, the box on your first screen is your
   > explicit consent to the app storing them with your answers, and the
   > second box before your first chat is your explicit consent to sending
   > them to our AI provider.

2. **§6, deleting.** It says that if you delete everything, "your answers,
   chats and notes are gone and your access ends". Since 20 October the app
   separates the two: deleting what you wrote keeps the account and the
   purchase, and the account only closes if you tick the second box. The
   privacy page already says this; the terms do not.

## What publishing this costs

The terms carry a date, and the PDF of the version that applied on the day of
a purchase is attached to that purchase (lib/terms-versions.ts). So a change
means four steps, in this order:

1. The lawyer approves the wording above.
2. terms.html on the website gets the new section and the two corrections,
   with a new "Last updated" date.
3. `node web/scripts/print-terms.cjs` prints the new dated PDF into
   `web/public/terms/`, and the new version is added to `TERMS_VERSIONS` with
   its `from` date.
4. Deploy. From that date, purchase confirmations attach the new version;
   purchases made before it keep the 24 October PDF, which is the point of
   keeping both.

**Mwata decides one thing first:** whether this becomes a second version
dated after today, or an amendment to the 24 October version. A second version
is the honest answer if anybody has bought under the 24 October terms; an
amendment is only defensible if nobody has.
