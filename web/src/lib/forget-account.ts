/**
 * Which tables hold a person and what happens to each.
 *
 * Two lists, and nothing else: no imports, so the test that reads the SQL
 * and checks that every table of a person is in one list or the other can
 * load this file with plain node. The deleting itself is in
 * lib/forget-account-server.ts.
 */

/**
 * Everything a person wrote, by table.
 *
 * "Delete everything I wrote" empties these and leaves the account standing,
 * so somebody who paid for the course can start their workbook again without
 * losing the course (Mwata, 20 October). Deleting the account as well takes
 * these with it, and the entitlement too.
 */
export const WRITTEN_BY_PERSON = [
  "answers",
  "exercise_status",
  "conversations",
  "ai_profile",
  "part_results",
  "feedback",
  "page_feedback",
  "questions",
  "video_progress",
  "private_pages",
  "profiles",
] as const;

/**
 * What stays when the account stays, and why.
 *
 * These are records rather than writing: what was bought, what was agreed,
 * what was asked back, what the app did on somebody's behalf. The privacy
 * page says the same thing in its own words, and a table that belongs to
 * neither list is a table nobody has decided about.
 */
export const KEPT_RECORDS: Record<string, string> = {
  entitlements: "what was bought; it goes only when the account does",
  consents: "the record that consent was given and withdrawn",
  withdrawals: "the record of a withdrawal from the contract",
  withdrawal_requests: "the same record, before it was settled",
  purchase_claims: "the record that a course was moved between accounts",
  partner_seats: "the seat belongs to the purchase, not to the writing",
  usage_log: "what the AI partner was asked to do, for security and limits",
  retention_notice: "the record that a quiet account was warned",
  partner_endings: "the record that a seat ended, and what was done about it",
};
