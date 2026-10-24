# The Dutch withdrawal page: the sentences that need the lawyer's words

24 October 2026. Item A2.1 asks for a Dutch version of
`app.maderealblueprint.com/withdraw`, with a language switch at the top. The
switch and the second copy of the page are a morning's work. The wording is
not mine to write: this page is the one place where a wrong word costs a
right, and a translation of a legal sentence is a new legal sentence.

Two Dutch strings were given in the brief and are used as given:

| English | Dutch |
| --- | --- |
| Withdraw from contract here | Hier de overeenkomst ontbinden |
| Confirm withdrawal | Ontbinding bevestigen |

These are the rest, in the order they appear. The English is what is live
today; the Dutch column is for the lawyer.

## The page

1. **Withdraw from contract** (the heading)
2. You can withdraw from your purchase of Phase 1 of The Made Real Blueprint within 14 days of buying, without giving a reason. You do not need to sign in.
3. We refund the full price to the payment method you used. Beyond those 14 days our own 30-day guarantee applies: email info@maderealblueprint.com with your order number, and tell us in a line or two what did not work for you. That is our own promise rather than a legal right, and the reason is what lets us improve the course; the full refund does not depend on it.
4. You can also email info@maderealblueprint.com, or use the model withdrawal form in the terms. Any of these is enough: the date of your message is the date of your withdrawal.
5. Back to the app

## The form, for somebody who is not signed in

6. Your email address (the one you bought with)
7. Your name
8. Your order number, if you have it (optional)
9. If you like, tell us what did not work (optional)
10. We use what you write here to answer you and to improve the course. It does not change your refund.
11. That did not work. Please check your internet, or email info@maderealblueprint.com.

## The card, for somebody who is signed in

12. Phase 1, bought on [date].
13. Your access ends and you get the full price back.
14. We refund the full price you paid, to the payment method you used, within 14 days. There is nothing else for you to do.
15. Your withdrawal is recorded
16. We have your withdrawal, dated [date].
17. You had already asked, on [date].
18. This purchase has already been refunded.
19. That did not work. Please email info@maderealblueprint.com.

## The confirmation email

The letter is item A2.2 and is built, in English. Its Dutch version needs the
same treatment. The lines are:

20. We received it on [date] at [time] ([zone]), which is [date] at [time] UTC.
21. What you told us: Email / Order number / Name
22. Reference: W-000007
23. You withdrew inside the 14 days, so we refund the full price you paid, to the payment method you used, within 14 days.
24. The refund is due by [date], which is 14 days from today.
25. The date of this message is the date of your withdrawal.
26. Your access to the app ends on [date], three days from now, so you have a little time in case you change your mind.
27. Before that date, open My settings and download your workbook, so you keep everything you have written. Your answers are deleted 30 days after your access ends, or sooner if you ask us.
28. We could not match your email address to a purchase, so no access has changed. We will look at it by hand and reply to you. If you have your order number from Lemon Squeezy, reply with it and it will be quicker.
29. Reply to this email if you change your mind, or if anything above is wrong. If you did not make this request, reply to this email and we will stop it.

## What happens when the Dutch arrives

The page becomes two files of words and one page of code: a language switch
at the top that remembers nothing, carries `?taal=nl` in the address, and is
also what decides which language the confirmation email is written in, as
A2.2 asks. Nothing else about the flow changes.
