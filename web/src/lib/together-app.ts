/**
 * The sharing rules (together.ts) tied to this app's own file, together.json.
 *
 * Used by the browser to decide what to draw and where to send an answer, and
 * by the server to decide what may actually be read or written. The server copy
 * is the one that counts.
 */
import togetherRaw from "@/content/together.json";
import {
  asksForAgreement,
  isShared,
  kindOf,
  mineFieldsOf,
  personalPages,
  privateAllowed,
  sharedPages,
  statusIsShared,
  type Kind,
  type TogetherConfig,
} from "@/lib/together";

export const togetherConfig = togetherRaw as unknown as TogetherConfig;

export const pageKind = (exerciseId: string): Kind => kindOf(togetherConfig, exerciseId);
export const sharedAnswer = (exerciseId: string, fieldId: string) => isShared(togetherConfig, exerciseId, fieldId);
export const sharedStatus = (exerciseId: string) => statusIsShared(togetherConfig, exerciseId);
export const personalFieldsOf = (exerciseId: string) => mineFieldsOf(togetherConfig, exerciseId);
export const allSharedPages = () => sharedPages(togetherConfig);
export const allPersonalPages = () => personalPages(togetherConfig);
export const mayKeepPrivate = (exerciseId: string) => privateAllowed(togetherConfig, exerciseId);
export const wantsAgreement = (exerciseId: string) => asksForAgreement(togetherConfig, exerciseId);
