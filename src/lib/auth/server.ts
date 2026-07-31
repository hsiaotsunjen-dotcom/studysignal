import { AuthError } from "@/lib/auth/errors";
import { createEmailVerificationProvider } from "@/lib/auth/emailVerification/createProvider";
import { ParentSignupService } from "@/lib/auth/ParentSignupService";
import { FileAuthStore } from "@/lib/auth/store/FileAuthStore";

let singleton: ParentSignupService | null = null;

/** Server-side PRD-001 auth service (file store + configured verification provider). */
export function getParentSignupService(): ParentSignupService {
  if (!singleton) {
    singleton = new ParentSignupService(
      new FileAuthStore(),
      createEmailVerificationProvider(),
    );
  }
  return singleton;
}

export function authErrorResponse(err: unknown): {
  body: { error: string; code: string };
  status: number;
} {
  if (err instanceof AuthError) {
    const status =
      err.code === "UNAUTHORIZED"
        ? 401
        : err.code === "EMAIL_TAKEN" ||
            err.code === "FAMILY_EXISTS" ||
            err.code === "STUDENT_EXISTS"
          ? 409
          : err.code === "EMAIL_NOT_VERIFIED"
            ? 403
            : err.code === "STORE_UNAVAILABLE"
              ? 503
              : 400;
    return { body: { error: err.message, code: err.code }, status };
  }
  // Never leak stacks; keep JSON shape stable for clients.
  console.error("[auth] unexpected error", err);
  return {
    body: { error: "發生了一些問題，請再試一次。", code: "INTERNAL" },
    status: 500,
  };
}

export function readSessionToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    return token || null;
  }
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)ss_session=([^;]+)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function sessionCookieHeader(token: string, expiresAt: string): string {
  const maxAge = Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `ss_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
