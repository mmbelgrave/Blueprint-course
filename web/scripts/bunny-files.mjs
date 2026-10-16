/* Which files does this Bunny video actually have? Same signing as the app. */
import { createHmac } from "node:crypto";
import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const cdn = env.NEXT_PUBLIC_BUNNY_CDN, key = env.BUNNY_TOKEN_KEY, id = process.argv[2];
const base64url = (b) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const expires = Math.floor(Date.now() / 1000) + 600;
const dir = `/${id}/`;
const token = `HS256-${base64url(createHmac("sha256", key).update(`${dir}${expires}token_path=${dir}`).digest())}`;
const query = new URLSearchParams({ token, expires: String(expires), token_path: dir });
const referer = "https://app.maderealblueprint.com/";
for (const file of ["audio.mp3", "captions/en.vtt", "captions/en-US.vtt", "thumbnail.jpg", "preview.webp", "play_720p.mp4", "playlist.m3u8"]) {
  const r = await fetch(`https://${cdn}${dir}${file}?${query}`, { headers: { referer } });
  console.log(`${String(r.status).padEnd(4)} ${file}${r.ok ? `  (${r.headers.get("content-type")}, ${r.headers.get("content-length") ?? "?"} bytes)` : ""}`);
}
