// Builds and serves a preview-mode copy (no Supabase, no sign-in) on port 3001,
// next to the normal dev server — for testing screens with made-up answers.
// Run: node scripts/preview-mode.cjs   (then open http://localhost:3001)
// Empty values are kept by Next.js (it never overrides existing variables),
// so the app runs in preview mode even though .env.local has real keys.
const path = require("node:path");
const { execFileSync } = require("node:child_process");

process.env.NEXT_PUBLIC_SUPABASE_URL = "";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
const web = path.resolve(__dirname, "..");
const bin = path.join(web, "node_modules/next/dist/bin/next");
// A separate build folder, so the real build in .next is never overwritten.
process.env.NEXT_DIST_DIR_PREVIEW = "1";
execFileSync(process.execPath, [path.join(web, "scripts/sync-content.mjs")], { stdio: "inherit" });
execFileSync(process.execPath, [bin, "build", web], { stdio: "inherit", env: process.env });
process.argv = [process.argv[0], bin, "start", web, "-p", "3001"];
require(bin);
