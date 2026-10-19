/**
 * Walking every account, a page at a time.
 *
 * Supabase hands out accounts in pages. Asking for a big page and using what
 * comes back is the quiet kind of wrong: at a thousand and one people the
 * page arrives full, the screen draws what it was given, and nobody is told
 * that the rest are missing (review round 4, concern 3).
 *
 * The retention sweep and find-account.ts walk the same way. This is the
 * version with nothing else in the file, so it can be tested on its own.
 */
export const PER_PAGE = 200;
export const MAX_PAGES = 50;

export type AuthUser = {
  id: string;
  email?: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type Lister = {
  auth: {
    admin: {
      listUsers: (o: { page: number; perPage: number }) => Promise<{
        data: { users: AuthUser[] } | null;
        error: { message: string } | null;
      }>;
    };
  };
};

/**
 * Every account, or a clear error. Never a short list passed off as the whole.
 */
export async function everyAccount(admin: Lister): Promise<AuthUser[]> {
  const all: AuthUser[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw new Error("Could not read the accounts.");
    const users = data?.users ?? [];
    all.push(...users);
    // A short page is the last page.
    if (users.length < PER_PAGE) return all;
  }
  // Better a loud stop than an overview that quietly leaves people out.
  throw new Error(`More than ${MAX_PAGES * PER_PAGE} accounts: the overview needs paging on the page itself.`);
}
