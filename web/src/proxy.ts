import type { NextRequest } from "next/server";
import { guardAdmin } from "@/lib/supabase-proxy";

export function proxy(request: NextRequest) {
  return guardAdmin(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
