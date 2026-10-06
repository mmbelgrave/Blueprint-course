import assert from "node:assert/strict";
import { test } from "node:test";
import { looksLikeVideoId, playbackUrl, signToken } from "../src/lib/bunny.ts";

const KEY = "a-test-signing-key";
const VIDEO = "0e1f2a3b4c5d6e7f8091a2b3c4d5e6f7";
const NOW = 1_760_000_000_000; // a fixed moment, so the tests do not drift

test("the same inputs always give the same token", () => {
  const a = signToken({ key: KEY, tokenPath: "/x/", expires: 123 });
  const b = signToken({ key: KEY, tokenPath: "/x/", expires: 123 });
  assert.equal(a, b);
  assert.match(a, /^HS256-/, "Bunny's advanced scheme names itself");
});

test("a token is safe to put in an address", () => {
  // Over many keys, base64 will certainly produce + and / unless they are replaced.
  for (let i = 0; i < 200; i++) {
    const t = signToken({ key: `key-${i}`, tokenPath: `/video-${i}/`, expires: 1_700_000_000 + i });
    assert.ok(!t.includes("+"), t);
    assert.ok(!t.includes("/"), t);
    assert.ok(!t.includes("="), t);
  }
});

test("anything that changes, changes the token", () => {
  const base = { key: KEY, tokenPath: "/a/", expires: 1000 };
  const t = signToken(base);
  assert.notEqual(signToken({ ...base, key: "other" }), t, "another key");
  assert.notEqual(signToken({ ...base, tokenPath: "/b/" }), t, "another video");
  assert.notEqual(signToken({ ...base, expires: 1001 }), t, "another moment");
  assert.notEqual(signToken({ ...base, params: { token_path: "/a/" } }), t, "other parameters count too");
});

test("the extra parameters are signed in a fixed order", () => {
  const one = signToken({ key: KEY, tokenPath: "/a/", expires: 9, params: { b: "2", a: "1" } });
  const two = signToken({ key: KEY, tokenPath: "/a/", expires: 9, params: { a: "1", b: "2" } });
  assert.equal(one, two, "the order they were written in must not matter");
});

/*
 * The whole point, and it cost an afternoon to learn: a playlist names other
 * playlists and dozens of segments by *relative* address. A relative address
 * inherits the folder it sits in and never the query string. So the token has
 * to be in the path, before the video's folder, or the playlist loads and every
 * segment is refused.
 */
test("the token is in the path, so relative addresses inherit it", () => {
  const { url, expires } = playbackUrl({ cdn: "vz-test.b-cdn.net", videoId: VIDEO, key: KEY, now: NOW });
  const u = new URL(url);
  assert.equal(u.host, "vz-test.b-cdn.net");
  assert.equal(u.search, "", "nothing in the query: that is the whole point");
  assert.ok(u.pathname.startsWith("/bcdn_token="), "the token comes first");
  assert.ok(u.pathname.endsWith(`/${VIDEO}/playlist.m3u8`), "the video's own folder comes last");
  assert.ok(u.pathname.includes(`expires=${expires}`));
  assert.ok(u.pathname.includes(encodeURIComponent(`/${VIDEO}/`)), "the directory is declared");

  // What the player will actually ask for next, resolved the way a browser does.
  const child = new URL("360p/video.m3u8", url).href;
  assert.ok(child.includes("bcdn_token="), "the child playlist keeps the token");
  assert.ok(child.endsWith(`/${VIDEO}/360p/video.m3u8`));
});

test("an address stops working, and not too soon", () => {
  const { expires } = playbackUrl({ cdn: "c", videoId: VIDEO, key: KEY, now: NOW, minutes: 20 });
  const seconds = expires - Math.floor(NOW / 1000);
  assert.equal(seconds, 1200);
  assert.ok(seconds >= 600, "long enough to start a video on a slow phone");
  assert.ok(seconds <= 3600, "short enough that a shared address is soon useless");
});

test("the sound-only file is signed by the same directory token", () => {
  const video = playbackUrl({ cdn: "c", videoId: VIDEO, key: KEY, now: NOW });
  const audio = playbackUrl({ cdn: "c", videoId: VIDEO, key: KEY, now: NOW, file: "audio.mp3" });
  assert.ok(new URL(audio.url).pathname.endsWith(`/${VIDEO}/audio.mp3`));
  const tokenOf = (u: string) => new URL(u).pathname.split("/")[1];
  assert.equal(tokenOf(audio.url), tokenOf(video.url), "same directory, same token");
});

test("a video id is recognised, and nonsense is not", () => {
  assert.equal(looksLikeVideoId(VIDEO), true);
  assert.equal(looksLikeVideoId("3fa85f64-5717-4562-b3fc-2c963f66afa6"), true, "a GUID with dashes");
  assert.equal(looksLikeVideoId("../../etc/passwd"), false);
  assert.equal(looksLikeVideoId(""), false);
  assert.equal(looksLikeVideoId("short"), false);
});
