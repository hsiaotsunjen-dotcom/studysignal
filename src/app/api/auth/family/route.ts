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

    const parsed = await readJsonObject(request, { allowEmpty: true });
    if (!parsed.ok) return parsed.response;

    const next = await getParentSignupService().createFamily(session.token, {
      familyName:
        typeof parsed.value.familyName === "string"
          ? parsed.value.familyName
          : undefined,
    });
    return authJson({ session: next });
  } catch (err) {
    return authFail(err);
  }
}
