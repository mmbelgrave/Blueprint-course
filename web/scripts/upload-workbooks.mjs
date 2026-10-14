/*
 * Puts an exported workbook PDF in the private "workbooks" bucket, under the
 * name modules.json asks for, and reads it back: the hash of what was sent and
 * the hash of what the bucket holds are both printed, so an upload is checked
 * rather than assumed.
 *
 * Run from web/, with .env.local in place:
 *   node scripts/upload-workbooks.mjs step-1.pdf="…/The Made Real Blueprint - Step 1.pdf"
 *
 * Several at once is fine. Without arguments it lists what is in the bucket.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const short = (buffer) => createHash("sha256").update(buffer).digest("hex").slice(0, 16);

for (const arg of process.argv.slice(2)) {
  const at = arg.indexOf("=");
  const name = arg.slice(0, at);
  const body = readFileSync(arg.slice(at + 1));
  const { error } = await supabase.storage
    .from("workbooks")
    .upload(name, body, { contentType: "application/pdf", upsert: true });
  if (error) {
    console.error(`${name}: ${error.message}`);
    process.exit(1);
  }
  const { data, error: back } = await supabase.storage.from("workbooks").download(name);
  if (back) {
    console.error(`${name}: uploaded, but could not be read back (${back.message})`);
    process.exit(1);
  }
  const there = Buffer.from(await data.arrayBuffer());
  const same = short(body) === short(there);
  console.log(`${name}: sent ${body.length} bytes ${short(body)}, bucket has ${there.length} ${short(there)} ${same ? "(same)" : "(DIFFERENT)"}`);
  if (!same) process.exit(1);
}

const { data: list, error } = await supabase.storage.from("workbooks").list();
if (error) console.error(error.message);
for (const file of list ?? []) {
  console.log(` · ${file.name}  ${file.metadata?.size ?? "?"} bytes  updated ${file.updated_at}`);
}
