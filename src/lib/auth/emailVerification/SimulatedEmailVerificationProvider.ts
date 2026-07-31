import { randomInt } from "crypto";

import type { EmailVerificationProvider } from "@/lib/auth/emailVerification/types";

const TTL_MS = 15 * 60 * 1000;

/**
 * Simulated provider — same issue/deliver contract as a real mailer.
 * Does not change API responses or user journey.
 */
export class SimulatedEmailVerificationProvider
  implements EmailVerificationProvider
{
  async issueCode(_input: {
    parentId: string;
    email: string;
  }): Promise<{ code: string; expiresAt: Date }> {
    // Dev/smoke only: AUTH_FIXED_VERIFY_CODE=123456 keeps API journey identical.
    const fixed = process.env.AUTH_FIXED_VERIFY_CODE?.trim();
    const code =
      fixed && /^\d{6}$/.test(fixed)
        ? fixed
        : String(randomInt(100000, 1000000));
    return { code, expiresAt: new Date(Date.now() + TTL_MS) };
  }

  async deliverCode(input: {
    email: string;
    code: string;
    expiresAt: Date;
  }): Promise<{ accepted: boolean; expiresAt: string }> {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[auth:verify] simulated delivery to ${input.email} code=${input.code} expires=${input.expiresAt.toISOString()}`,
      );
    }
    return {
      accepted: true,
      expiresAt: input.expiresAt.toISOString(),
    };
  }
}
