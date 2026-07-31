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

    const next = await getParentSignupService().updateProfile(session.token, {
      displayName:
        typeof parsed.value.displayName === "string"
          ? parsed.value.displayName
          : "",
    });
    return authJson({ session: next });
  } catch (err) {
    return authFail(err);
  }
}
