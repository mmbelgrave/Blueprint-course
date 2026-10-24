/**
 * A zip file, written by hand.
 *
 * The download people are promised is "everything you wrote", and until now
 * it left out the pictures, which for some people are half of 1.2 (Mwata,
 * 24 October). A folder of JPEGs and two text files is a zip, and a zip is a
 * handful of byte structures that have not changed since 1989.
 *
 * Entries are stored, not deflated. A JPEG is already compressed, so deflate
 * would buy a per cent and cost a dependency; the two text files are small.
 * Nothing is imported here, so the whole format can be tested on its own.
 *
 * What is deliberately not here: zip64 (over 4 GB, or more than 65,535
 * files), encryption, and anything to do with directories, which a zip does
 * not need: a file called "pictures/one.jpg" makes the folder.
 */

export type ZipEntry = { name: string; bytes: Uint8Array };

/** The table CRC-32 wants, built once. */
const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

/** The checksum every zip entry carries. */
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** The date and time, in the shape MS-DOS used and zip kept. */
function dosTime(when: Date): { time: number; date: number } {
  const time = (when.getHours() << 11) | (when.getMinutes() << 5) | (Math.floor(when.getSeconds() / 2) & 0x1f);
  const date = ((when.getFullYear() - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
  return { time, date };
}

const utf8 = (s: string) => new TextEncoder().encode(s);

/**
 * One zip, in memory.
 *
 * A name with characters outside ASCII is written as UTF-8 with the flag that
 * says so (bit 11), which is what every unzip since Windows 7 reads.
 */
export function zip(entries: ZipEntry[], when = new Date()): Uint8Array {
  const { time, date } = dosTime(when);
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = utf8(entry.name);
    const sum = crc32(entry.bytes);
    const size = entry.bytes.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); // "PK\3\4"
    local.setUint16(4, 20, true); // version needed
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, sum, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true); // no extra field
    locals.push(new Uint8Array(local.buffer), name, entry.bytes);

    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true); // "PK\1\2"
    dir.setUint16(4, 20, true); // made by
    dir.setUint16(6, 20, true); // version needed
    dir.setUint16(8, 0x0800, true);
    dir.setUint16(10, 0, true);
    dir.setUint16(12, time, true);
    dir.setUint16(14, date, true);
    dir.setUint32(16, sum, true);
    dir.setUint32(20, size, true);
    dir.setUint32(24, size, true);
    dir.setUint16(28, name.length, true);
    dir.setUint16(30, 0, true); // extra
    dir.setUint16(32, 0, true); // comment
    dir.setUint16(34, 0, true); // disk
    dir.setUint16(36, 0, true); // internal attributes
    dir.setUint32(38, 0, true); // external attributes
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), name);

    offset += 30 + name.length + size;
  }

  const centralSize = central.reduce((n, part) => n + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); // "PK\5\6"
  end.setUint16(4, 0, true);
  end.setUint16(6, 0, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  end.setUint16(20, 0, true); // no comment

  const parts = [...locals, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
