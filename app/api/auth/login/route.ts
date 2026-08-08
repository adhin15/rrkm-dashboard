import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, SESSION_TTL_MS } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }

  const ok = await verifyPassword(String(password), user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }

  const token = await createSession(user.id);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
