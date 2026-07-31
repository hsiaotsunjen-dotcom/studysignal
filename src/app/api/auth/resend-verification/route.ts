import {
  authFail,
  authJson,
  getParentSignupService,
  requireSession,
} from "@/lib/auth/http";

export async function POST(request: Request) {
  try {
    const session = requireSession(request);
    if (!session.ok) return session.response;

    // Body optional — ignore invalid JSON for resend.
    try {
      await request.text();
    } catch {
      // ignore
    }

    const result = await getParentSignupService().resendVerification(
      session.token,
    );
    return authJson({
      accepted: true,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    return authFail(err);
  }
}
