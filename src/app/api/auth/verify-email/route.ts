import {
  authFail,
  authJson,
  getParentSignupService,
  readJsonObject,
  requireSession,
} from "@/lib/auth/http";

export async function POST(request: Request) {
  try {
    const session = requireSession(request);
    if (!session.ok) return session.response;

    const parsed = await readJsonObject(request);
    if (!parsed.ok) return parsed.response;

    const code =
      typeof parsed.value.code === "string" ? parsed.value.code : "";
    const next = await getParentSignupService().verifyEmail(
      session.token,
      code,
    );
    return authJson({ session: next });
  } catch (err) {
    return authFail(err);
  }
}
