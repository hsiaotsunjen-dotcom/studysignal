/**
 * Thin client for PRD-001 auth APIs.
 * No business rules — surfaces backend JSON as-is.
 *
 * Development: see `demoAuth.ts` — session reads short-circuit so MVP can
 * skip real signup without deleting production auth.
 */

import {
  enterDemoMode,
  getDemoAuthSession,
  isDemoAuthEnabled,
} from "@/lib/demoAuth";

export type OnboardingStep =
  | "verify_email"
  | "parent_profile"
  | "create_family"
  | "invite_student"
  | "complete";

export type AuthSession = {
  parent: {
    id: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
  };
  family: { id: string; name: string } | null;
  student: { id: string; name: string; grade?: string } | null;
  onboardingStep: OnboardingStep;
};

export type AuthErrorBody = {
  error: string;
  code: string;
};

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("伺服器回應格式不正確，請稍后再試。");
  }
}

export function pathForOnboardingStep(step: OnboardingStep): string {
  switch (step) {
    case "verify_email":
      return "/v1/verify-email";
    case "parent_profile":
      return "/v1/profile";
    case "create_family":
      return "/v1/family";
    case "invite_student":
      return "/v1/invite";
    case "complete":
      return "/v1/success";
  }
}

/** Route parent to the correct PRD-001 step from backend onboardingStep. */
export function resolveOnboardingPath(session: AuthSession | null): string | null {
  if (!session) return null;
  return pathForOnboardingStep(session.onboardingStep);
}

function errorMessage(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as AuthErrorBody).error === "string" &&
    (data as AuthErrorBody).error
  ) {
    return (data as AuthErrorBody).error;
  }
  return fallback;
}

export async function getAuthSession(): Promise<AuthSession | null> {
  // DEV MVP: skip real session API; keep production path below untouched.
  if (isDemoAuthEnabled()) {
    return getDemoAuthSession();
  }

  const res = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(data, "無法讀取登入狀態。"));
  }
  const session = (data as { session?: AuthSession | null } | null)?.session;
  return session ?? null;
}

async function postAuth(
  path: string,
  body: Record<string, unknown> | undefined,
  fallbackError: string,
): Promise<unknown> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body
        ? { "Content-Type": "application/json; charset=utf-8" }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(data, fallbackError));
  }
  return data;
}

function requireSession(data: unknown, fallbackError: string): AuthSession {
  const session = (data as { session?: AuthSession } | null)?.session;
  if (!session) {
    throw new Error(fallbackError);
  }
  return session;
}

export async function signUp(input: {
  parentName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthSession> {
  // DEV MVP: no API / email verification — seed mock parent and continue.
  if (isDemoAuthEnabled()) {
    return enterDemoMode();
  }

  const data = await postAuth(
    "/api/auth/signup",
    input,
    "無法建立帳號，請稍后再試。",
  );
  return requireSession(data, "無法建立帳號，請稍后再試。");
}

export async function verifyEmail(code: string): Promise<AuthSession> {
  const data = await postAuth(
    "/api/auth/verify-email",
    { code },
    "驗證失敗，請稍后再試。",
  );
  return requireSession(data, "驗證失敗，請稍后再試。");
}

export async function resendVerification(): Promise<{ expiresAt: string }> {
  const data = await postAuth(
    "/api/auth/resend-verification",
    {},
    "無法重新傳送驗證碼，請稍后再試。",
  );
  const expiresAt = (data as { expiresAt?: string } | null)?.expiresAt;
  return { expiresAt: expiresAt ?? "" };
}

export async function updateProfile(input: {
  displayName: string;
}): Promise<AuthSession> {
  const data = await postAuth(
    "/api/auth/profile",
    input,
    "無法更新資料，請稍后再試。",
  );
  return requireSession(data, "無法更新資料，請稍后再試。");
}

export async function createFamily(input: {
  familyName?: string;
}): Promise<AuthSession> {
  const data = await postAuth(
    "/api/auth/family",
    { familyName: input.familyName },
    "無法建立家庭，請稍后再試。",
  );
  return requireSession(data, "無法建立家庭，請稍后再試。");
}

export async function inviteStudent(input: {
  studentName: string;
  grade?: string;
}): Promise<AuthSession> {
  const data = await postAuth(
    "/api/auth/invite-student",
    {
      studentName: input.studentName,
      ...(input.grade !== undefined ? { grade: input.grade } : {}),
    },
    "無法邀請孩子，請稍后再試。",
  );
  return requireSession(data, "無法邀請孩子，請稍后再試。");
}
