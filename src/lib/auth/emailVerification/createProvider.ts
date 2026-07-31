import { SimulatedEmailVerificationProvider } from "@/lib/auth/emailVerification/SimulatedEmailVerificationProvider";
import type { EmailVerificationProvider } from "@/lib/auth/emailVerification/types";

/**
 * Factory for verification providers.
 * Swap implementation via AUTH_EMAIL_PROVIDER without changing API or journey (PRD-001 AC7).
 */
export function createEmailVerificationProvider(): EmailVerificationProvider {
  const kind = (process.env.AUTH_EMAIL_PROVIDER ?? "simulated").toLowerCase();
  if (kind === "simulated") {
    return new SimulatedEmailVerificationProvider();
  }
  // Future: return new RealEmailVerificationProvider(...)
  // Keep journey identical — only this factory changes.
  return new SimulatedEmailVerificationProvider();
}
