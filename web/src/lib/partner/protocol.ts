// Shared by the partner API route and the browser.
// A reply streams as plain text; the stream ends with STATUS_MARK + JSON status.
export const STATUS_MARK = String.fromCharCode(30); // ASCII "record separator", never typed by people

export type PartnerStatus = { ok: boolean; error?: string; trimmed?: boolean };

/** The four helper buttons, in the order they are shown. */
export const HELPER_LABELS = {
  start: "Help me start",
  deeper: "Ask me a deeper question",
  challenge: "Challenge me",
  fit: "How does this fit?",
} as const;

export type PartnerHelper = keyof typeof HELPER_LABELS;
