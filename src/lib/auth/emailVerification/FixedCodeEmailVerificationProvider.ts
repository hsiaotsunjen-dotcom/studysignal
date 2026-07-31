/**
 * Controllable provider for domain tests — same contract as production providers.
 */
import type { EmailVerificationProvider } from "@/lib/auth/emailVerification/types";

export class FixedCodeEmailVerificationProvider
  implements EmailVerificationProvider
{
  readonly deliveries: Array<{ email: string; code: string }> = [];

  constructor(
    private readonly code = "123456",
    private readonly ttlMs = 15 * 60 * 1000,
  ) {}

  async issueCode(): Promise<{ code: string; expiresAt: Date }> {
    return { code: this.code, expiresAt: new Date(Date.now() + this.ttlMs) };
  }

  async deliverCode(input: {
    email: string;
    code: string;
    expiresAt: Date;
  }): Promise<{ accepted: boolean; expiresAt: string }> {
    this.deliveries.push({ email: input.email, code: input.code });
    return { accepted: true, expiresAt: input.expiresAt.toISOString() };
  }
}
