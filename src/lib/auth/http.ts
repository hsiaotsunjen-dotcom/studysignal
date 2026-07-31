import { NextResponse } from "next/server";

import { AuthError } from "@/lib/auth/errors";
import {
  authErrorResponse,
  getParentSignupService,
  readSessionToken,
  sessionCookieHeader,
} from "@/lib/auth/server";

export type AuthErrorBody = { error: string; code: string };

/** Always JSON — never HTML error pages from auth handlers. */
export function authJson(
  data: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): NextResponse {
  const response = NextResponse.json(data, { status: init?.status ?? 200 });
  response.headers.set("Content-Type", "application/json; charset=utf-8");
  if (init?.headers) {
    for (const [k, v] of Object.entries(init.headers)) {
      response.headers.set(k, v);
    }
  }
  return response;
}

export function authFail(err: unknown): NextResponse {
  const { body, status } = authErrorResponse(err);
  return authJson(body, { status });
}

/**
 * Safe JSON body parse for auth APIs.
 * Empty body → {}; invalid / non-object JSON → 400 with stable error shape.
 */
export async function readJsonObject(
  request: Request,
  options?: { allowEmpty?: boolean },
): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  const allowEmpty = options?.allowEmpty ?? false;
  const raw = await request.text();
  if (!raw.trim()) {
    if (allowEmpty) return { ok: true, value: {} };
    return {
      ok: false,
      response: authJson(
        { error: "請傳送 JSON。", code: "INVALID_INPUT" } satisfies AuthErrorBody,
        { status: 400 },
      ),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      response: authJson(
        { error: "請傳送有效的 JSON。", code: "INVALID_INPUT" } satisfies AuthErrorBody,
        { status: 400 },
      ),
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      response: authJson(
        { error: "請傳送 JSON 物件。", code: "INVALID_INPUT" } satisfies AuthErrorBody,
        { status: 400 },
      ),
    };
  }

  return { ok: true, value: parsed as Record<string, unknown> };
}

export function readSessionTokenSafe(request: Request): string | null {
  try {
    return readSessionToken(request);
  } catch {
    return null;
  }
}

export function requireSession(
  request: Request,
): { ok: true; token: string } | { ok: false; response: NextResponse } {
  const token = readSessionTokenSafe(request);
  if (!token) {
    return {
      ok: false,
      response: authJson(
        { error: "請先登入後再繼續。", code: "UNAUTHORIZED" } satisfies AuthErrorBody,
        { status: 401 },
      ),
    };
  }
  return { ok: true, token };
}

export function setSessionCookie(
  response: NextResponse,
  sessionToken: string,
  expiresAt: string,
): NextResponse {
  response.headers.set(
    "Set-Cookie",
    sessionCookieHeader(sessionToken, expiresAt),
  );
  return response;
}

export { getParentSignupService, AuthError };
