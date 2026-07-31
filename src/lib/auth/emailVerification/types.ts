/**
 * Email verification provider contract.
 * UI/journey stay identical; swap Simulated → Real without API shape changes (PRD-001 AC7).
 */

export type VerificationSendResult = {
  /** Always true for contract parity; delivery is provider concern */
  accepted: boolean;
  /** ISO expiry for client messaging */
  expiresAt: string;
};

export type EmailVerificationProvider = {
  /**
   * Issue a challenge for the parent email.
   * Returns plaintext code only to the service layer for storage hashing —
   * never expose to API responses (except future debug flags).
   */
  issueCode(input: {
    parentId: string;
    email: string;
  }): Promise<{ code: string; expiresAt: Date }>;

  /** Optional side effect: deliver code (simulated logs; real sends email). */
  deliverCode(input: {
    email: string;
    code: string;
    expiresAt: Date;
  }): Promise<VerificationSendResult>;
};
