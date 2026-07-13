import { NextRequest, NextResponse } from "next/server";

// TEMPORARY — debugging the Apple Pay "payment not complete" issue live on
// a real device without console access. Logs whatever the client sends so
// it shows up in `vercel logs`. Delete this route once resolved.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  console.error("[client-error]", JSON.stringify(body));
  return NextResponse.json({ ok: true });
}
