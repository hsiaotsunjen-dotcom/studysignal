/**
 * PRD-001 Authentication domain types.
 * Architecture: Authentication module — Parent owns Family; Student belongs under Family.
 */

export type ParentAccount = {
  id: string;
  email: string;
  /** scrypt hash */
  passwordHash: string;
  displayName: string;
  emailVerified: boolean;
  /** Confirmed on parent profile step (may reuse signup name). */
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Family = {
  id: string;
  ownerParentId: string;
  name: string;
  createdAt: string;
};

export type StudentMember = {
  id: string;
  familyId: string;
  name: string;
  grade?: string;
  invitedAt: string;
};

export type SessionRecord = {
  token: string;
  parentId: string;
  createdAt: string;
  expiresAt: string;
};

export type VerificationChallenge = {
  parentId: string;
  /** hashed code */
  codeHash: string;
  expiresAt: string;
  createdAt: string;
};

export type AuthStoreSnapshot = {
  parents: ParentAccount[];
  families: Family[];
  students: StudentMember[];
  sessions: SessionRecord[];
  challenges: VerificationChallenge[];
};

/** Computed onboarding position for clients — same whether verification is simulated or real */
export type OnboardingStep =
  | "verify_email"
  | "parent_profile"
  | "create_family"
  | "invite_student"
  | "complete";

export type PublicParent = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
};

export type PublicFamily = {
  id: string;
  name: string;
};

export type PublicStudent = {
  id: string;
  name: string;
  grade?: string;
};

export type SessionView = {
  parent: PublicParent;
  family: PublicFamily | null;
  student: PublicStudent | null;
  onboardingStep: OnboardingStep;
};
