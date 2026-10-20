/*
 * How long the live app actually takes, measured rather than guessed.
 *
 * Run it from web/, with .env.local in place:
 *
 *   node scripts/speed-check.cjs              the live app
 *   APP=http://localhost:3111 node scripts/speed-check.cjs   a local one
 *
 * Public pages are fetched as anybody would. The pages and routes behind a
 * sign-in are fetched with a throwaway free account, which is deleted at the
 * end. Each one is asked three times: the first is the cold one.
 */
const fs = require("fs");

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const APP = process.env.APP ?? "https://app.maderealblueprint.com";
const ref = new URL(SB).hostname.split(".")[0];
const admin = { apikey: SVC, authorization: `Bearer ${SVC}`, "content-type": "application/json" };

const ms = (n) => `${Math.round(n)} ms`;

async function time(url, init = {}) {
  const started = performance.now();
  const res = await fetch(url, { redirect: "manual", ...init });
  const headers = performance.now() - started;
  const body = await res.arrayBuffer();
  return { status: res.status, headers, total: performance.now() - started, bytes: body.byteLength, location: res.headers.get("location") };
}

async function measure(label, url, init, runs = 3) {
  const times = [];
  let last;
  for (let i = 0; i < runs; i++) {
    last = await time(url, init);
    times.push(last.total);
  }
  const first = times[0];
  const warm = times.slice(1);
  const best = Math.min(...times);
  console.log(
    `${label.padEnd(42)} ${String(last.status).padEnd(4)} first ${ms(first).padStart(8)}   warm ${warm.map(ms).join(", ").padEnd(20)} best ${ms(best).padStart(8)}   ${(last.bytes / 1024).toFixed(0)} KB`,
  );
  return { label, first, best, status: last.status, last };
}

(async () => {
  console.log(`app: ${APP}\nsupabase: ${SB}\n`);
  console.log("── public, signed out ───────────────────────────────────────────────────────");
  for (const [label, path] of [
    ["home /", "/"],
    ["/free", "/free"],
    ["/withdraw", "/withdraw"],
    ["/privacy", "/privacy"],
    ["/signin", "/signin"],
  ]) {
    await measure(label, APP + path);
  }

  if (!SVC) return console.log("\nno service key: stopping before the signed-in half");

  console.log("\n── a throwaway free account ─────────────────────────────────────────────────");
  const email = `speed-${Date.now()}@maderealblueprint.test`;
  const password = `Tt-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const made = await (await fetch(`${SB}/auth/v1/admin/users`, {
    method: "POST", headers: admin, body: JSON.stringify({ email, password, email_confirm: true }),
  })).json();
  if (!made.id) return console.log("could not make the account:", JSON.stringify(made).slice(0, 200));

  const tok = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  })).json();
  const value = "base64-" + Buffer.from(JSON.stringify(tok)).toString("base64");
  const name = `sb-${ref}-auth-token`;
  const chunks = value.match(/.{1,3180}/g);
  const cookie = chunks.length === 1 ? `${name}=${chunks[0]}` : chunks.map((c, i) => `${name}.${i}=${c}`).join("; ");
  const signedIn = { headers: { cookie } };

  console.log("\n── signed in: the routes a screen waits for ─────────────────────────────────");
  for (const [label, path] of [
    ["GET /api/withdraw", "/api/withdraw"],
    ["GET /api/consent", "/api/consent"],
    ["GET /api/answers", "/api/answers"],
    ["GET /api/content?step=step-1", "/api/content?step=step-1"],
    ["GET /api/profile", "/api/profile"],
  ]) {
    await measure(label, APP + path, signedIn);
  }

  console.log("\n── signed in: pages ─────────────────────────────────────────────────────────");
  for (const [label, path] of [["/settings", "/settings"], ["/modules", "/modules"], ["/dashboard", "/dashboard"]]) {
    await measure(label, APP + path, signedIn);
  }

  console.log("\n── the free exercise, the way somebody downloads it ─────────────────────────");
  const link = await measure("GET /api/workbook?free=ordinary-tuesday", `${APP}/api/workbook?free=ordinary-tuesday`, signedIn);
  if (link.last.location) {
    await measure("  then the PDF from storage", link.last.location, {}, 2);
  } else {
    console.log("  no redirect to follow:", link.status);
  }

  /* The same file, signed here, to separate our route from the download. */
  const signed = await (await fetch(`${SB}/storage/v1/object/sign/workbooks/free-ordinary-tuesday.pdf`, {
    method: "POST", headers: admin, body: JSON.stringify({ expiresIn: 300 }),
  })).json();
  if (signed.signedURL) await measure("  the PDF, signed straight from Supabase", SB + "/storage/v1" + signed.signedURL, {}, 2);

  await fetch(`${SB}/auth/v1/admin/users/${made.id}`, { method: "DELETE", headers: admin });
  console.log("\nthrowaway account deleted.");
})();
