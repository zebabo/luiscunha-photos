import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { config } from "./config";

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

function secret(): string {
  if (!config.sessionSecret || config.sessionSecret.length < 16) {
    throw new Error("Defina SESSION_SECRET (mínimo 16 caracteres) no ficheiro .env");
  }
  return config.sessionSecret;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function checkPassword(password: string): boolean {
  if (!config.adminPassword) return false;
  return safeEqual(password, config.adminPassword);
}

export async function createSession() {
  const expires = String(Date.now() + MAX_AGE * 1000);
  (await cookies()).set(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [expires, sig] = raw.split(".");
  if (!expires || !sig || !safeEqual(sig, sign(expires))) return false;
  return Number(expires) > Date.now();
}

/** Usar em todas as páginas, server actions e rotas do admin. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
