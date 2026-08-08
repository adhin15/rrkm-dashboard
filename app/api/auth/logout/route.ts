import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  await deleteSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
