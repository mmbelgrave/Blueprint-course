/**
 * Supabase answers in its own words ("Bucket not found", a row-level-security
 * message), and a browser that cannot read an iPhone photo says "The source
 * image could not be decoded". None of that helps the person holding the phone,
 * so every message is turned into something they can act on.
 * Kept apart from the storage code so it can be tested on its own.
 */
export function friendlyError(raw: string): string {
  const m = (raw ?? "").toLowerCase();
  if (m.includes("bucket not found") || m.includes("bucket") && m.includes("not found")) {
    return "The picture store is not ready yet. Mwata has to switch it on; everything else on this page works.";
  }
  if (m.includes("row-level security") || m.includes("row level security") || m.includes("violates") || m.includes("unauthorized") || m.includes("jwt")) {
    return "Your sign-in has expired. Please reload the page and sign in again.";
  }
  if (m.includes("decode") || m.includes("decoded")) {
    return 'This browser cannot read that picture. iPhone photos are often HEIC: in Settings → Camera → Formats choose "Most Compatible", or send the photo to yourself first, which turns it into a JPG.';
  }
  if (m.includes("payload too large") || m.includes("maximum allowed size") || m.includes("too large")) {
    return "That picture is too big, even after shrinking it. Please try a smaller one.";
  }
  if (m.includes("mime") || m.includes("not supported")) {
    return "That kind of file cannot be used as a picture. Please choose a photo.";
  }
  if (m.includes("network") || m.includes("failed to fetch") || m.includes("timeout")) {
    return "The picture could not be sent. Please check your internet and try again.";
  }
  return "The picture could not be added. Please try again.";
}
