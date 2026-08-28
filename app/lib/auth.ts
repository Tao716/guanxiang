export const AUTH_COOKIE = "guanxiang_auth";
const TOKEN_DAYS = 30;

function base64url(bytes: Uint8Array) {
  let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized); return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
async function hmac(value: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error("SESSION_SECRET is required in production");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign", "verify"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

function sessionSecret() {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? null : "guanxiang-local-development-secret-change-me";
}

export function authConfiguration() {
  return { sessionSecret:Boolean(sessionSecret()), inviteCodes:inviteCodes().length };
}

export async function userIdForInvite(invite: string) {
  const digest = await hmac(`invite:${invite.trim().toUpperCase()}`);
  return `u_${base64url(digest).slice(0, 30)}`;
}

export async function createAuthToken(userId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_DAYS * 86400;
  const payload = `${userId}.${expiresAt}`; const signature = base64url(await hmac(payload));
  return `${payload}.${signature}`;
}

export async function verifyAuthToken(token: string | undefined | null) {
  if (!token || !sessionSecret()) return null;
  try {
    const [userId, expiry, signature, ...rest] = token.split(".");
    if (rest.length || !/^u_[A-Za-z0-9_-]{20,40}$/.test(userId ?? "") || !/^\d{10}$/.test(expiry ?? "") || !signature) return null;
    if (Number(expiry) <= Math.floor(Date.now() / 1000)) return null;
    const expected = await hmac(`${userId}.${expiry}`); const supplied = decode(signature);
    if (expected.length !== supplied.length) return null;
    let difference = 0; for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ supplied[index];
    return difference === 0 ? userId : null;
  } catch { return null; }
}

export function inviteCodes() { return (process.env.INVITE_CODES || "").split(",").map((code) => code.trim().toUpperCase()).filter(Boolean); }

export function authCookie(token: string, secure: boolean) {
  return `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TOKEN_DAYS * 86400}${secure ? "; Secure" : ""}`;
}

export function clearAuthCookie() { return `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`; }

export function tokenFromRequest(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const pair of cookies.split(";")) { const [name, ...parts] = pair.trim().split("="); if (name === AUTH_COOKIE) return parts.join("="); }
  return null;
}

export async function userIdFromRequest(request: Request) { return verifyAuthToken(tokenFromRequest(request)); }
