import {
  authFail,
  authJson,
  getParentSignupService,
  readJsonObject,
  setSessionCookie,
} from "@/lib/auth/http";

export async function POST(request: Request) {
  try {
    const parsed = await readJsonObject(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;

    const result = await getParentSignupService().signUp({
      parentName: typeof body.parentName === "string" ? body.parentName : "",
      email: typeof body.email === "string" ? body.email : "",
      password: typeof body.password === "string" ? body.password : "",
      confirmPassword:
        typeof body.confirmPassword === "string" ? body.confirmPassword : "",
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
