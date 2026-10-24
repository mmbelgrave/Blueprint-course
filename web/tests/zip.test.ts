/*
 * The zip the download is wrapped in (Mwata, 24 October).
 *
 * A file nobody can open is worse than no file, so this checks the bytes
 * rather than the idea: the signatures, the offsets, the checksum and the
 * names. The proof that a real unzip accepts it is in the commit message:
 * one was written to disk and expanded with Windows' own Expand-Archive.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { crc32, zip } from "../src/lib/zip.ts";

const text = (s: string) => new TextEncoder().encode(s);
const word = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8);
const long = (b: Uint8Array, at: number) => (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;

test("the checksum is the one every unzip expects", () => {
  // The CRC-32 of "123456789" is the standard check value for this algorithm.
  assert.equal(crc32(text("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array()), 0);
});

test("a zip starts with PK, ends with the directory, and counts its files", () => {
  const out = zip([
    { name: "everything.json", bytes: text('{"ok":true}') },
    { name: "pictures/1.2/one.jpg", bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 1, 2, 3]) },
  ]);
  assert.equal(long(out, 0), 0x04034b50, "the first local header");

  const end = out.length - 22;
  assert.equal(long(out, end), 0x06054b50, "the end of the central directory");
  assert.equal(word(out, end + 8), 2, "two files on this disk");
  assert.equal(word(out, end + 10), 2, "two files in all");

  const centralAt = long(out, end + 16);
  assert.equal(long(out, centralAt), 0x02014b50, "the central directory starts where it says");
});

test("each file is stored whole, with its own checksum and its own name", () => {
  const bytes = text("a picture, pretend");
  const out = zip([{ name: "pictures/1.2/one.jpg", bytes }]);

  assert.equal(word(out, 8), 0, "stored, not deflated");
  assert.equal(word(out, 6) & 0x0800, 0x0800, "names are UTF-8");
  assert.equal(long(out, 14), crc32(bytes));
  assert.equal(long(out, 18), bytes.length, "compressed size");
  assert.equal(long(out, 22), bytes.length, "size");

  const nameLength = word(out, 26);
  const name = new TextDecoder().decode(out.slice(30, 30 + nameLength));
  assert.equal(name, "pictures/1.2/one.jpg");

  const stored = out.slice(30 + nameLength, 30 + nameLength + bytes.length);
  assert.deepEqual([...stored], [...bytes], "the file is in there, byte for byte");
});

test("an empty zip is still a zip", () => {
  const out = zip([]);
  assert.equal(out.length, 22);
  assert.equal(long(out, 0), 0x06054b50);
});
