/*
 * Does Bunny accept the addresses we sign? (spec §6.4)
 *
 *   node scripts/bunny-check.mjs <videoId>
 *
 * Bunny documents two signing schemes and the dashboard does not say which a
 * library uses, so this tries both against the real CDN and says which one
 * works. Run it once after turning CDN token authentication on, and again if
 * video ever stops playing for no obvious reason.
 *
 * It reads web/.env.local. The key is never printed, never sent anywhere except
 * to Bunny, and never leaves this machine.
 */
import { createHash, createHmac } from "node:crypto";
import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const cdn = env.NEXT_PUBLIC_BUNNY_CDN;
const key = env.BUNNY_TOKEN_KEY;
const videoId = process.argv[2];

if (!cdn || !key) {
  console.log("Add NEXT_PUBLIC_BUNNY_CDN and BUNNY_TOKEN_KEY to web/.env.local first (GO-LIVE section 7b).");
  process.exit(1);
}
if (!videoId) {
  console.log("Which video? node scripts/bunny-check.mjs <videoId>");
  process.exit(1);
}

const base64url = (b) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const expires = Math.floor(Date.now() / 1000) + 600;
const path = `/${videoId}/`;

// The two schemes Bunny documents, each signed for the directory so the
// segments are covered as well as the playlist.
const schemes = {
  "advanced (HMAC-SHA256)": () => {
    const token = `HS256-${base64url(createHmac("sha256", key).update(`${path}${expires}token_path=${path}`).digest())}`;
    return `https://${cdn}${path}playlist.m3u8?token=${encodeURIComponent(token)}&expires=${expires}&token_path=${encodeURIComponent(path)}`;
  },
  "basic (SHA256 of key + path + expires)": () => {
    const token = base64url(createHash("sha256").update(`${key}${path}${expires}`).digest());
    return `https://${cdn}${path}playlist.m3u8?token=${encodeURIComponent(token)}&expires=${expires}&token_path=${encodeURIComponent(path)}`;
  },
};

console.log(`Asking ${cdn} for video ${videoId}\n`);

let working = null;
for (const [name, build] of Object.entries(schemes)) {
  try {
    const res = await fetch(build(), { redirect: "follow" });
    const body = res.ok ? (await res.text()).slice(0, 60).replace(/\n/g, " ") : "";
    console.log(`  ${res.status}  ${name}${res.ok ? `  →  ${body}…` : ""}`);
    if (res.ok && !working) working = name;
  } catch (e) {
    console.log(`  ---  ${name}: could not reach it (${e.message})`);
  }
}

// Without a token at all: this must fail, or the videos are not protected.
try {
  const open = await fetch(`https://${cdn}${path}playlist.m3u8`);
  console.log(`\n  ${open.status}  with no token at all ${open.ok ? "— NOT PROTECTED, check CDN token authentication" : "— refused, as it should be"}`);
} catch {
  console.log("\n  ---  with no token at all: could not reach it");
}

console.log(
  working
    ? `\nUse: ${working}. If that is not what src/lib/bunny.ts does, change it there.`
    : "\nNeither scheme worked. Check that the video has finished encoding, that CDN token authentication is on, and that the hostname is the library's own.",
);
