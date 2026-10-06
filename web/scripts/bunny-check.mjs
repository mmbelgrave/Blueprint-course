/*
 * Can we play a Bunny video, and if not, why not? (spec §6.4)
 *
 *   node scripts/bunny-check.mjs <videoId>
 *
 * Three things can stop a video playing and they look alike from outside, so
 * this tells them apart:
 *
 *   403  the address was refused — a wrong token, or a referer the library
 *        does not allow (Security → General → Allowed domains)
 *   404  the token was fine and the file is not there — almost always a video
 *        that has not finished encoding
 *   200  it plays
 *
 * Learned the hard way on 6 October: with Allowed domains set, a request with
 * no referer at all is refused whatever the token says, so this sends one.
 *
 * The key is read from web/.env.local, never printed, and goes nowhere except
 * to Bunny.
 */
import { createHmac } from "node:crypto";
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
const referer = process.argv[3] ?? "https://app.maderealblueprint.com/";

if (!cdn || !key) {
  console.log("Add NEXT_PUBLIC_BUNNY_CDN and BUNNY_TOKEN_KEY to web/.env.local first (GO-LIVE section 7b).");
  process.exit(1);
}
if (!videoId) {
  console.log("Which video?  node scripts/bunny-check.mjs <videoId> [referer]");
  process.exit(1);
}

const base64url = (b) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const expires = Math.floor(Date.now() / 1000) + 600;
const dir = `/${videoId}/`;

// The scheme this library accepts, proved against the real CDN on 6 October.
// It must stay the same as src/lib/bunny.ts.
const token = `HS256-${base64url(createHmac("sha256", key).update(`${dir}${expires}token_path=${dir}`).digest())}`;
const query = new URLSearchParams({ token, expires: String(expires), token_path: dir });
const ask = (file, headers = {}) => fetch(`https://${cdn}${dir}${file}?${query}`, { headers });

console.log(`${cdn}\nvideo ${videoId}\nreferer ${referer}\n`);

const playlist = await ask("playlist.m3u8", { referer });
const original = await ask("original", { referer });
const noReferer = await ask("playlist.m3u8");
const noToken = await fetch(`https://${cdn}${dir}playlist.m3u8`, { headers: { referer } });

console.log(`  ${playlist.status}  the stream (playlist.m3u8)`);
console.log(`  ${original.status}  the uploaded file (original)`);
console.log(`  ${noReferer.status}  the stream, with no referer`);
console.log(`  ${noToken.status}  the stream, with no token`);

console.log("");
if (playlist.ok) {
  console.log("It plays. Signing, referer and encoding are all right.");
} else if (playlist.status === 404 && original.ok) {
  console.log("The token works — 'original' was served — but there is no stream yet.");
  console.log("The video is still encoding, or encoding produced nothing. Check the dashboard;");
  console.log("a video that says Processing, 0 Bytes, is not ready.");
} else if (playlist.status === 403) {
  console.log("Refused. Either the token is wrong, or this referer is not in");
  console.log("Security → General → Allowed domains.");
} else {
  console.log("Neither. Check the video id and that the hostname is this library's own.");
}

if (noToken.ok) console.log("\nWARNING: it played with no token at all. CDN token authentication is not on.");
if (!noReferer.ok && playlist.ok) {
  console.log("\nNote: without a referer it is refused, so Allowed domains is in use.");
  console.log("Add localhost and the vercel.app preview addresses, or video will not play while testing.");
}
