import {
  authFail,
  authJson,
  getParentSignupService,
  readSessionTokenSafe,
} from "@/lib/auth/http";

export async function GET(request: Request) {
  try {
    const token = readSessionTokenSafe(request);
    if (!token) {
      return authJson({ session: null });
    }
    const session = await getParentSignupService().getSession(token);
    return authJson({ session });
  } catch (err) {
    return authFail(err);
  }
}
