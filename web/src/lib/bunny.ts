/**
 * Signing a Bunny playback address (spec §6.4).
 *
 * With CDN token authentication on, the video files answer only to a signed,
 * short-lived address. The signing key never leaves the server: the browser
 * asks /api/video/url for an address and gets one that works for a few minutes,
 * and only if that person owns the step.
 *
 * The trap is HLS. A playlist is not one file: it names dozens of segments, and
 * the player fetches each of them. A token signed for the playlist alone would
 * let the playlist load and then every segment would be refused. So the token
 * is signed for the **directory** (Bunny calls this token_path), which covers
 * the playlist and everything beside it.
 *
 * Bunny's "advanced" scheme, from their documentation:
 *   hashed   = signature_path + expires + [user_ip] + signing_data
 *   token    = "HS256-" + flags + base64url(HMAC-SHA256(key, hashed))
 * where signing_data is the other query parameters, sorted by name, and flags
 * is "1-" when an address is tied to one viewer's IP (we do not).
 */
import { createHmac } from "node:crypto";

/** Base64, made safe to put in an address. */
const base64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export type SignOptions = {
  /** The library's token authentication key. Never sent to the browser. */
  key: string;
  /** The directory the token covers, with both slashes: "/{videoId}/". */
  tokenPath: string;
  /** Seconds since 1970 when the address stops working. */
  expires: number;
  /** Any other query parameters that travel with the address. */
  params?: Record<string, string>;
};

export function signToken({ key, tokenPath, expires, params = {} }: SignOptions): string {
  const extra = Object.keys(params)
    .filter((k) => k !== "token" && k !== "expires")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("");
  const hashed = `${tokenPath}${expires}${extra}`;
  return `HS256-${base64url(createHmac("sha256", key).update(hashed).digest())}`;
}

export type PlaybackOptions = {
  /** The library's pull zone hostname, e.g. vz-abc123.b-cdn.net */
  cdn: string;
  /** Bunny's id for one video (a GUID). */
  videoId: string;
  key: string;
  /** How long the address should work. Long enough to start, short enough to be useless if shared. */
  minutes?: number;
  /** For tests; defaults to now. */
  now?: number;
  /** "playlist.m3u8" for video, or the audio file for listening. */
  file?: string;
};

export type Playback = { url: string; expires: number };

/**
 * An address the player can use. The directory is signed, so the playlist and
 * every segment under it are allowed by the same token.
 */
export function playbackUrl({
  cdn,
  videoId,
  key,
  minutes = 20,
  now = Date.now(),
  file = "playlist.m3u8",
}: PlaybackOptions): Playback {
  const expires = Math.floor(now / 1000) + minutes * 60;
  const tokenPath = `/${videoId}/`;
  const token = signToken({ key, tokenPath, expires, params: { token_path: tokenPath } });
  const query = new URLSearchParams({ token, expires: String(expires), token_path: tokenPath });
  return { url: `https://${cdn}${tokenPath}${file}?${query}`, expires };
}

/** Is this a Bunny video id rather than something a person typed? */
export const looksLikeVideoId = (id: string) => /^[0-9a-f-]{32,40}$/i.test(id);
