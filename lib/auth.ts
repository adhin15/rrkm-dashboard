import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// Session lifetime: 7 hari
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Hash password (bcrypt, cost default 10)
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

// Verifikasi password terhadap hash
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Buat session baru untuk user, kembalikan token
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { token, userId, expiresAt },
  });
  return token;
}

// Validasi token session: return userId jika valid & belum expired
export async function validateSession(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.userId;
}

// Hapus session (logout)
export async function deleteSession(token: string | null | undefined): Promise<void> {
  if (!token) return;
  await prisma.session.delete({ where: { token } }).catch(() => {});
}
