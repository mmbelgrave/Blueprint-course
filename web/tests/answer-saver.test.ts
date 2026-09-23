import assert from "node:assert/strict";
import { test } from "node:test";
import { AnswerSaver, type PendingAnswer, type SaveState } from "../src/lib/answer-saver.ts";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const item = (fieldId: string, value: unknown): PendingAnswer => ({
  userId: "u1",
  exerciseId: "3.2",
  fieldId,
  value,
});

/** A fake database that can go offline, and slow down single saves. */
function fakeStore() {
  const stored = new Map<string, unknown>();
  const db = {
    stored,
    online: true,
    slowNext: 0,
    async save(i: PendingAnswer) {
      const delay = db.slowNext;
      db.slowNext = 0;
      if (delay) await wait(delay);
      if (!db.online) throw new Error("offline");
      stored.set(i.fieldId, i.value);
    },
  };
  return db;
}

test("reviewer case: never 'saved' while another field failed", async () => {
  const db = fakeStore();
  const states: SaveState[] = [];
  // The retry comes 600 ms after the failure, far after B is saved — also on a busy machine.
  const saver = new AnswerSaver(db.save, (s) => states.push(s), 10, 600);

  db.online = false;
  saver.schedule(item("A", "77"));
  await wait(40);
  assert.equal(states.at(-1), "error");

  db.online = true;
  saver.schedule(item("B", "5"));
  await wait(60); // B is stored, A still waits for its retry
  assert.equal(db.stored.get("B"), "5");
  assert.equal(db.stored.get("A"), undefined);
  assert.notEqual(states.at(-1), "saved");

  await wait(700); // retry happened
  assert.equal(db.stored.get("A"), "77");
  assert.equal(states.at(-1), "saved");
  assert.equal(saver.hasUnsaved, false);
});

test("retryFailed saves failed fields right away (internet back)", async () => {
  const db = fakeStore();
  const saver = new AnswerSaver(db.save, () => {}, 10, 10_000);
  db.online = false;
  saver.schedule(item("A", "x"));
  await wait(30);
  db.online = true;
  saver.retryFailed();
  await wait(10);
  assert.equal(db.stored.get("A"), "x");
});

test("saves of one field arrive in order, so newer text wins", async () => {
  const db = fakeStore();
  const saver = new AnswerSaver(db.save, () => {}, 5, 1000);
  db.slowNext = 60; // the first save is slow
  saver.schedule(item("A", "old"));
  await wait(15);
  saver.schedule(item("A", "new"));
  await wait(120);
  assert.equal(db.stored.get("A"), "new");
});

test("flush saves waiting answers right away and waits for them", async () => {
  const db = fakeStore();
  const saver = new AnswerSaver(db.save, () => {}, 10_000, 1000);
  saver.schedule(item("A", "typed just now"));
  assert.equal(db.stored.get("A"), undefined);
  await saver.flush();
  assert.equal(db.stored.get("A"), "typed just now");
  assert.equal(saver.hasUnsaved, false);
});

test("a failed old value does not overwrite a newer one", async () => {
  const db = fakeStore();
  const saver = new AnswerSaver(db.save, () => {}, 5, 30);
  db.online = false;
  saver.schedule(item("A", "old"));
  await wait(15);
  db.online = true;
  saver.schedule(item("A", "new"));
  await wait(80);
  assert.equal(db.stored.get("A"), "new");
  assert.equal(saver.hasUnsaved, false);
});
