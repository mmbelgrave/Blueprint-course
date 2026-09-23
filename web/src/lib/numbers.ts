/**
 * Reads amounts the way people write them in different countries:
 * "1.500", "1,500", "1 500", "€200" -> 1500 / 200; "12,50", "12.5" -> decimals.
 * A single separator followed by exactly three digits is a thousands separator.
 */
export function toNumber(v: unknown): number {
  let s = String(v ?? "").replace(/[^\d.,-]/g, "");
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    // Both used: the last one is the decimal separator.
    const dec = lastDot > lastComma ? "." : ",";
    const thousands = dec === "." ? "," : ".";
    s = s.split(thousands).join("").replace(dec, ".");
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? "." : ",";
    const parts = s.split(sep);
    const isThousands = parts.length > 2 || parts[1].length === 3;
    s = isThousands ? parts.join("") : parts.join(".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
