import { localAuth, localStore } from "./local";
import { supabaseAuth, supabaseStore } from "./supabase";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const auth = isSupabaseConfigured ? supabaseAuth : localAuth;
export const store = isSupabaseConfigured ? supabaseStore : localStore;

export * from "./types";
