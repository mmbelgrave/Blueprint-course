# Test script: AI consent and withdrawal

19 October 2026. Everything below is live. The parts I could test from here
are already done and are listed at the end, so this is only what needs a real
person, a real inbox, or a real payment.

Work top to bottom. Each step says what you should see. If something differs,
write down what you saw and stop at that step rather than carrying on.

**The accounts, as of this morning.** info@maderealblueprint.com ("Kees", no
answers) is deleted. Four are left: michael.g.lundby@gmail.com and
mmbelgrave@hotmail.com, which stay; nutricao.renata@hotmail.com, which holds
the real order 9762789 and is the subject of section 4; and
info@belgraveconsultancy.com, which is the partner seat on that order. I am
keeping the seat account until section 4 is done, because a refund is supposed
to end the seat as well and that is worth seeing. Say the word afterwards and
it goes.

---

## 1. The consent screen (5 minutes)

Sign in as **mmbelgrave@hotmail.com** and open any exercise page with an AI
panel, for example Step 1, page 0.1.

1. The panel shows "Your AI partner is optional" with two boxes, both empty.
   - [ ] "Switch on my AI partner" is greyed out and does nothing.
   - [ ] Under the name it says "You are talking to an AI, not a person. It can
         be wrong, and it does not give legal, tax, immigration, medical or
         financial advice."
2. Tick only the first box.
   - [ ] The button becomes live.
3. Press **Not now**.
   - [ ] The panel says your AI partner is switched off, with a link to switch
         it on and a link to My settings. The screen does not come back when
         you reload the page: you are not asked twice.
4. Press **Switch it on**, tick the first box, press the button.
   - [ ] The chat appears, and under the message box: "Please avoid health
         details and other sensitive data unless you want your AI partner to
         use them."
5. Send one message.
   - [ ] A reply streams in.
6. Go to **My settings**.
   - [ ] "Who may read your answers" shows the AI tick on, with the date you
         agreed, and the special-categories tick underneath it. There is no
         third tick: Mwata cannot read anybody's answers any more.
7. Switch the AI tick off, go back to the exercise, send a message.
   - [ ] It refuses: "Your AI partner is switched off."
8. Switch it back on in Settings.
   - [ ] The chat works again, and your old chat is still there.

## 2. The draft button, same account

On a page with "Help me draft this", with the AI switched **off** in Settings.

- [ ] The button is replaced by a sentence saying it is switched off, with a
      way to switch it on.
- [ ] Switch it on, press the button, a draft appears.

## 3. The withdrawal page, without signing in (3 minutes)

Use a private window, so you are signed out.

1. Go to **app.maderealblueprint.com/withdraw**.
   - [ ] Email address, order number ("if you have it"), your name ("if you
         want"), and one button: Confirm withdrawal.
2. Type an address that has never bought anything, for example your own
   address with +test before the @, leave the order number empty, press the
   button.
   - [ ] The screen says the withdrawal is recorded, with the date, the time
         and your time zone, and that a confirmation was sent to that address.
   - [ ] It does **not** say whether that address bought anything.
3. Check that inbox.
   - [ ] Subject: "We received your withdrawal".
   - [ ] It says we could not match the address, that nothing has changed, and
         asks for the order number.
4. Check **info@maderealblueprint.com**.
   - [ ] A copy arrived, with "Order we matched: NONE - match this by hand".
5. Press the button a second time with the same address.
   - [ ] It says we already have a request from that address.

## 3b. The reason box, inside and outside the 14 days (2 minutes)

Only in My settings, or on the withdrawal page signed in, because that is where
the app knows which of the two windows you are in. Run this before section 4,
on your own account, and press **Keep my course** at the end of each.

1. Your purchase is less than 14 days old. Press **Withdraw from contract
   here**.
   - [ ] The box asks nothing. Two buttons, no field, no question about why.
2. After your 14 days have passed (or ask me to move the date back for a
   minute), press it again.
   - [ ] Above the buttons: "If you like, tell us what did not work
         (optional)", a box to write in, and the line saying your refund does
         not depend on it.
   - [ ] Leaving it empty still goes through.
   - [ ] What you write arrives in the letter to info@maderealblueprint.com,
         under "What they said did not work:".

This needs `web/supabase/2026-10-20-withdrawal-reason.sql` run once. Without
it the withdrawal still goes through; only the words are not kept.

## 4. The real thing, on the real order (20 minutes, then two waits)

Order 9762789 on **nutricao.renata@hotmail.com**, the only real purchase in
the database, with **info@belgraveconsultancy.com** sitting on its partner
seat. This runs the whole process for real: the withdrawal, the confirmation,
the three days, the refund, the seat, and in time the data.

Two things to know before you start. The refund is real money going back, and
Lemon Squeezy may keep its fee on a refunded order. And the ten answers in
Renata's account are deleted thirty days after her access ends, by the daily
job, which is the point of the test but is not undoable. Download her workbook
first if you want to keep them.

1. Sign in as nutricao.renata@hotmail.com, open **My settings**, and scroll to
   "Withdraw from contract".
   - [ ] It shows Phase 1, the date it was bought and the price.
2. Press "Withdraw from contract here".
   - [ ] It warns what happens before anything is done: access ends, the full
         price comes back, three days to change your mind.
3. Press "Confirm withdrawal".
   - [ ] The screen gives the date, the time, your time zone, the full refund
         promise and the date access ends, three days from today.
4. Check that inbox.
   - [ ] Subject "We received your withdrawal", with order 9762789, the
         amount, the three days, the download reminder and the line about
         replying if you did not make the request.
5. Check **info@maderealblueprint.com**.
   - [ ] "Withdrawal: nutricao.renata@hotmail.com", order matched, "Refund due
         by" fourteen days out.
6. Reload the app as Renata.
   - [ ] A band across every page: "You withdrew from the contract, so your
         access ends on [date]."
   - [ ] The course still works. Nothing is taken away yet.
7. Open **/admin** as mmbelgrave@hotmail.com.
   - [ ] Withdrawals shows it as "Waiting for the refund", with the order, the
         money due by date and the access end date.
8. In Lemon Squeezy, refund order 9762789 in full.
   - [ ] Within a minute /admin shows "Refunded".
   - [ ] Renata's account can no longer open Step 1: the refund closes it at
         once, without waiting for the three days.
   - [ ] The partner seat on info@belgraveconsultancy.com is ended, so that
         account loses the course too.
9. Three days later, if you had not refunded, access would have stopped on its
   own. Nothing to do; it is the same end either way.
10. Thirty days after the access end date, the daily job deletes Renata's
    answers, chats and account, and keeps the withdrawal record and the order
    record. You can watch for it in /admin under the webhook list
    ("withdrawal_data_deleted"). Tell me if you would rather not wait and I
    will show you the same thing on a throwaway account.

## 5. The daily job (2 minutes)

In Vercel, open the project, **Cron Jobs**, and run `/api/retention` by hand.

- [ ] It answers `{"ok":true, ...}` with counts, not an error.
- [ ] In /admin, the webhook list shows nothing alarming. On a normal day this
      job has nothing to do and says so.

## 6. What was already tested from here

No need to repeat these. They were run against the live code on 19 October.

- A request to the AI with **no consent record** is refused by the server, not
  only hidden in the browser. Also when consent was switched off, and when it
  was granted under older wording. Done with a throwaway account that was
  deleted afterwards.
- The consent table refuses writes from the browser, and refuses any change to
  a row that was already written.
- Deleting an account deletes its consent rows with it.
- Both deletion jobs ran against the live database in dry mode: nothing due,
  nothing written.
- The withdrawal page refuses nothing except a missing email address, and
  answers a stranger without saying whether the address bought anything.
- The confirmation emails were rendered from the live code and read correctly.
- 281 unit tests, including the three-day grace, the consent version gate and
  the three-year consent history rule.

## 7. Still open after this

- The lawyer's three questions: the three-day grace wording, the retention
  paragraph, and whether consent history must outlive a deleted account.
- The apex domain still answers from GitHub Pages, so the website holds for
  ten minutes in a browser after each deploy. It settles when the DNS points
  at Vercel.
