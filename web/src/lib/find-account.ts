import "server-only";
/**
 * The account for an email address.
 *
 * Supabase has no "get the user with this address", so the list is walked.
 * It used to be walked once, 200 at a time — which worked until the 201st
 * person bought the course, at which point a real buyer would have been
 * handed a brand-new account and no entitlement, silently. So it keeps
 * turning pages until it finds them or runs out.
 *
 * The cap is there so a broken loop cannot run forever; 50 pages is 10,000
 * accounts, and long before that this should be a database lookup rather than
 * a walk.
 */
const PER_PAGE = 200;
const MAX_PAGES = 50;

type Admin = {
  auth: {
    admin: {
      listUsers: (o: { page: number; perPage: number }) => Promise<{
        data: { users: { id: string; email?: string | null }[] } | null;
        error: { message: string } | null;
      }>;
    };
  };
};

export async function findAccountByEmail(admin: Admin, email: string): Promise<string | null> {
  const wanted = email.trim().toLowerCase();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw new Error(`Could not look up ${wanted}: ${error.message}`);
    const users = data?.users ?? [];
    const found = users.find((u) => (u.email ?? "").toLowerCase() === wanted);
    if (found) return found.id;
    // A short page is the last page.
    if (users.length < PER_PAGE) return null;
  }
  // Rather than quietly answer "no such account" and make a second one.
  throw new Error(`Gave up looking for ${wanted} after ${MAX_PAGES * PER_PAGE} accounts.`);
}
