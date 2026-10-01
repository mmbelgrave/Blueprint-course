"use client";
// The vision board's pictures (Step 1, 1.2). They live in a private Supabase
// store, one folder per person, and are shown through short-lived links. The
// AI partner never sees them: it only reads the line a person writes under a
// picture, which is saved with the other answers.
import { isSupabaseConfigured } from "@/lib/backend";
import { supabaseBrowser } from "@/lib/backend/supabase";
import { friendlyError } from "@/lib/picture-errors";

const BUCKET = "boards";
/** A link stays valid for an hour; the page asks for a new one when it reloads. */
const LINK_SECONDS = 3600;
/** Long side of a stored picture. A phone photo of 4000px becomes 1600px. */
const MAX_SIDE = 1600;
const MAX_BYTES = 5 * 1024 * 1024;

export type Picture = { path: string; caption: string };

export const picturesAvailable = isSupabaseConfigured;

export class PictureError extends Error {}

export { friendlyError };

/** Shrinks and re-encodes in the browser, so uploads stay small. */
export async function shrink(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (e) {
    // An iPhone HEIC photo lands here: this browser cannot read the format.
    throw new PictureError(friendlyError(e instanceof Error ? e.message : "could not be decoded"));
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  return blob ?? file;
}

/** Uploads one picture into the person's own folder and returns its path. */
export async function uploadPicture(userId: string, pageId: string, file: File): Promise<string> {
  if (file.type && !file.type.startsWith("image/")) throw new PictureError("That file is not a picture.");
  const blob = await shrink(file);
  if (blob.size > MAX_BYTES) throw new PictureError("That picture is too big, even after shrinking it.");
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const path = `${userId}/${pageId}/${name}`;
  const { error } = await supabaseBrowser()
    .storage.from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new PictureError(friendlyError(error.message));
  return path;
}

/** Short-lived links for pictures, by path. Missing ones are simply left out. */
export async function pictureLinks(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabaseBrowser().storage.from(BUCKET).createSignedUrls(paths, LINK_SECONDS);
  if (error) throw new PictureError(friendlyError(error.message));
  const links: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) links[item.path] = item.signedUrl;
  return links;
}

/**
 * Every picture this person has, from the browser, under their own sign-in.
 * "Delete everything" calls this first: without the service role key the server
 * cannot reach the picture store, and the screen promises that all of it goes.
 */
export async function deleteAllPictures(userId: string): Promise<void> {
  const store = supabaseBrowser().storage.from(BUCKET);
  const { data: pages, error } = await store.list(userId);
  if (error) throw new PictureError(friendlyError(error.message));
  const paths: string[] = [];
  for (const page of pages ?? []) {
    const { data: files } = await store.list(`${userId}/${page.name}`);
    for (const file of files ?? []) paths.push(`${userId}/${page.name}/${file.name}`);
  }
  if (!paths.length) return;
  const { error: removeError } = await store.remove(paths);
  if (removeError) throw new PictureError(friendlyError(removeError.message));
}

export async function deletePicture(path: string): Promise<void> {
  const { error } = await supabaseBrowser().storage.from(BUCKET).remove([path]);
  if (error) throw new PictureError(friendlyError(error.message));
}
