/*
 * Take the example answers back out of an account.
 *
 * The other half of seed-my-answers.cjs: it empties the answers, the page
 * marks, the AI partner's notes and the drafts for one account, and leaves
 * the account, the purchase and the consent record alone.
 *
 *   node scripts/clear-my-answers.cjs mmbelgrave@hotmail.com
 *
 * It says what it is about to delete and asks for --yes before doing it.
 * Run from web/, with .env.local in place.
 */
const fs = require("fs");

const [email, ...flags] = process.argv.slice(2);
if (!email) {
  console.error("usage: node scripts/clear-my-answers.cjs <email> --yes");
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = { apikey: SVC, authorization: `Bearer ${SVC}`, "content-type": "application/json" };
const rest = (p, init) => fetch(`${SB}/rest/v1/${p}`, { headers: admin, ...init });

const TABLES = ["answers", "exercise_status", "part_results", "ai_profile", "conversations", "page_feedback"];

(async () => {
  const users = await (await fetch(`${SB}/auth/v1/admin/users?per_page=200`, { headers: admin })).json();
  const user = (users.users ?? users).find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
  if (!user) return console.error(`no account for ${email}`);

  for (const table of TABLES) {
    const res = await rest(`${table}?user_id=eq.${user.id}&select=user_id`, {
      headers: { ...admin, prefer: "count=exact", range: "0-0" },
    });
    console.log(`${table.padEnd(16)} ${res.headers.get("content-range") ?? "?"}`);
  }

  if (!flags.includes("--yes")) return console.log("\nNothing deleted. Add --yes to go ahead.");

  for (const table of TABLES) {
    const res = await rest(`${table}?user_id=eq.${user.id}`, { method: "DELETE", headers: admin });
    console.log(`${table}: ${res.ok ? "emptied" : `${res.status} ${(await res.text()).slice(0, 120)}`}`);
  }
  console.log("\nThe account, the purchase and the consent record are untouched.");
})();
