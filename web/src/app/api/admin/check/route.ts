// Tells the browser whether to show the "Admin" link. The admin email itself
// never goes to the browser.
import { isAdminRequest } from "@/lib/admin-server";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ admin: await isAdminRequest() });
}
