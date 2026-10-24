/*
 * Block B of the lawyer's review (24 October 2026): the rules, on their own.
 *
 *   B1  the sensitive-details consent, with its own wording version
 *   B2  the AI partner and the pages a household answers together
 *   B3  when a chat, and a switched-off AI partner's notes, are deleted
 *   B4  the partner seat: what goes, what stays, and when
 *   B5  the one reminder before a quiet account is deleted
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { notesFromSharedPages, sharedPagesAllowed, withoutSharedAnswers } from "../src/lib/ai-sharing.ts";
import {
  aiOffSince,
  consentState,
  rowsToWrite,
  SENSITIVE_TEXT,
  SENSITIVE_WORDING_VERSION,
  WORDING_VERSION,
  type ConsentRow,
} from "../src/lib/consent.ts";
import { CHAT_MONTHS, decide, deletionDay, quietMail, quietReminderMail, type Account } from "../src/lib/retention.ts";
import { deleteDay, PARTNER_ANSWERS, seatEndedMail, SEAT_DATA_DAYS } from "../src/lib/seat-end.ts";

const row = (kind: string, granted: boolean, at: string, version = WORDING_VERSION): ConsentRow => ({
  kind,
  granted,
  wording_version: version,
  recorded_at: at,
});

/* ---------------------------------------------------------------- B1 */

test("the sensitive-details tick is recorded against its own words", () => {
  const out = rowsToWrite([], { sensitive: true });
  assert.equal(out.length, 1);
  assert.equal(out[0].wording_version, SENSITIVE_WORDING_VERSION);
});

test("changing the AI wording does not ask for the sensitive answer again", () => {
  const rows = [row("sensitive", true, "2026-10-24T09:00:00Z", SENSITIVE_WORDING_VERSION)];
  const state = consentState(rows, "2027-01-01");
  assert.equal(state.sensitive, true);
  assert.equal(state.sensitiveAsked, true);
  assert.deepEqual(rowsToWrite(rows, { sensitive: true }), []);
});

test("a no is a record too, so nobody is asked twice", () => {
  const rows = [row("sensitive", false, "2026-10-24T09:00:00Z", SENSITIVE_WORDING_VERSION)];
  const state = consentState(rows);
  assert.equal(state.sensitive, false);
  assert.equal(state.sensitiveAsked, true);
});

test("the words the version stands for are the words on the screens", () => {
  for (const file of ["../src/app/onboarding/page.tsx", "../src/components/consent-settings.tsx"]) {
    const screen = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(screen, /SENSITIVE_TEXT\.lead/);
    assert.match(screen, /SENSITIVE_TEXT\.box/);
    assert.match(screen, /SENSITIVE_TEXT\.footnote/);
  }
  assert.ok(SENSITIVE_TEXT.lead.includes("sexual orientation or political opinions"));
  assert.ok(SENSITIVE_TEXT.box.includes("stores them with my answers"));
  assert.ok(SENSITIVE_TEXT.footnote.startsWith("Optional."));
});

/* ---------------------------------------------------------------- B2 */

test("a shared page needs both AI partners, and one person alone needs nobody", () => {
  assert.equal(sharedPagesAllowed({ pair: false, mineOn: true, theirsOn: true }), true);
  assert.equal(sharedPagesAllowed({ pair: true, mineOn: true, theirsOn: true }), true);
  assert.equal(sharedPagesAllowed({ pair: true, mineOn: true, theirsOn: false }), false);
  assert.equal(sharedPagesAllowed({ pair: true, mineOn: false, theirsOn: true }), false);
});

test("a consent we could not read counts as no", () => {
  assert.equal(sharedPagesAllowed({ pair: true, mineOn: true, theirsOn: null }), false);
});

test("the notes made from shared pages are the ones with a shared source", () => {
  const sources = {
    mine_only: [{ page: "1.1" }],
    both: [{ page: "1.1" }, { page: "3.2" }],
    theirs: [{ page: "3.3" }],
    patterns_and_tensions: [],
  };
  const shared = notesFromSharedPages(sources, (p) => p.startsWith("3."));
  assert.deepEqual(shared.sort(), ["both", "patterns_and_tensions", "theirs"]);
});

test("the patterns note is not shared when nothing else is", () => {
  const shared = notesFromSharedPages({ a: [{ page: "1.1" }], patterns_and_tensions: [] }, () => false);
  assert.deepEqual(shared, []);
});

test("the shared answers are the ones left out of what is sent", () => {
  const answers = { "1.1": { a: "mine" }, "3.2": { rent: "550", note: "ours" } };
  const left = withoutSharedAnswers(answers, (page) => page === "3.2");
  assert.deepEqual(left, { "1.1": { a: "mine" } });
});

/* ---------------------------------------------------------------- B3 */

test("switching the AI off is dated, switching it on again is not", () => {
  const off = [row("ai", true, "2026-01-01T10:00:00Z"), row("ai", false, "2026-06-01T10:00:00Z")];
  assert.equal(aiOffSince(off), "2026-06-01T10:00:00Z");
  assert.equal(aiOffSince([...off, row("ai", true, "2026-07-01T10:00:00Z")]), null);
  assert.equal(aiOffSince([]), null);
});

test("older wording is not somebody switching it off", () => {
  // They were asked again and have not answered. Nothing of theirs is waiting
  // to be deleted because of a choice they did not make.
  const rows = [row("ai", false, "2026-06-01T10:00:00Z", "2026-01-01")];
  assert.equal(aiOffSince(rows), null);
});

test("chats are kept for a year, like the other logs", () => {
  assert.equal(CHAT_MONTHS, 12);
});

/* ---------------------------------------------------------------- B4 */

test("a partner's own writing goes, their account and their questions stay", () => {
  const list = PARTNER_ANSWERS as readonly string[];
  for (const table of ["answers", "conversations", "ai_profile", "private_pages"]) {
    assert.ok(list.includes(table), table + " is the partner's own writing");
  }
  assert.ok(!list.includes("profiles"), "their name is not an answer");
  assert.ok(!list.includes("questions"), "a question to Help has its own twelve months");
});

test("the partner's answers go thirty days after the seat ends", () => {
  assert.equal(SEAT_DATA_DAYS, 30);
  const goes = deleteDay("2026-10-24T09:00:00Z");
  assert.equal(goes.toISOString().slice(0, 10), "2026-11-23");
});

test("the letter says when the seat ended and when the answers go", () => {
  const mail = seatEndedMail({
    appUrl: "https://app.maderealblueprint.com",
    email: "ben@example.com",
    endedOn: "24 October 2026",
    deleteOn: "23 November 2026",
  });
  assert.ok(mail.text.includes("ended on 24 October 2026"));
  assert.ok(mail.text.includes("before 23 November 2026"));
  assert.ok(mail.text.includes("Download the file"));
  // No sign-in link: the code is asked for, never sent.
  assert.ok(!/\/signin/.test(mail.text));
});

/* ---------------------------------------------------------------- B5 */

const account = (o: Partial<Account>): Account => ({
  id: "1",
  email: "a@b.c",
  lastSeen: "2024-01-01T00:00:00Z",
  boughtAt: null,
  warnedAt: null,
  remindedAt: null,
  ...o,
});

test("the reminder goes seven days before the deletion, once", () => {
  const now = new Date("2026-10-24T06:00:00Z");
  const warned = account({ warnedAt: "2026-10-01T06:00:00Z" }); // 23 days ago
  assert.equal(decide(warned, now).act, "remind");
  assert.equal(decide({ ...warned, remindedAt: "2026-10-01T07:00:00Z" }, now).act, "keep");
});

test("nothing is sent in the first three weeks, and the deletion still wins", () => {
  const now = new Date("2026-10-24T06:00:00Z");
  assert.equal(decide(account({ warnedAt: "2026-10-20T06:00:00Z" }), now).act, "keep");
  assert.equal(decide(account({ warnedAt: "2026-09-01T06:00:00Z" }), now).act, "delete");
});

test("the first letter says at least two quiet years", () => {
  const mail = quietMail({ appUrl: "https://app.maderealblueprint.com", email: "a@b.c" });
  assert.ok(mail.subject.includes("after at least two quiet years"), mail.subject);
});

test("the reminder names the day and asks for one sign-in", () => {
  const goesOn = deletionDay("2026-10-01T06:00:00Z");
  assert.equal(goesOn, "31 October 2026");
  const mail = quietReminderMail({ appUrl: "https://app.maderealblueprint.com", email: "a@b.c", goesOn });
  assert.ok(mail.text.includes("31 October 2026"));
  assert.ok(mail.text.includes("One sign-in is enough"));
});
