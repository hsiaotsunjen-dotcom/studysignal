import {
  authFail,
  authJson,
  getParentSignupService,
  readJsonObject,
  setSessionCookie,
} from "@/lib/auth/http";

/** Resume onboarding / return login — not social login (out of PRD scope). */
export async function POST(request: Request) {
  try {
    const parsed = await readJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;

    const result = await getParentSignupService().login({
      email: typeof body.email === "string" ? body.email : "",
      password: typeof body.password === "string" ? body.password : "",
    });

    return setSessionCookie(
      authJson({
        session: result.session,
        expiresAt: result.expiresAt,
      }),
      result.sessionToken,
      result.expiresAt,
    );
  } catch (err) {
    return authFail(err);
  }
}
