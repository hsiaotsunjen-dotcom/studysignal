import {
  hashOpaque,
  hashPassword,
  newId,
  newSessionToken,
  verifyOpaque,
  verifyPassword,
} from "@/lib/auth/crypto";
import { AuthError } from "@/lib/auth/errors";
import type { EmailVerificationProvider } from "@/lib/auth/emailVerification/types";
import {
  findChallenge,
  findFamilyByOwner,
  findParentByEmail,
  findParentById,
  findSession,
  findStudentByFamily,
  type AuthStore,
} from "@/lib/auth/store/AuthStore";
import type {
  AuthStoreSnapshot,
  OnboardingStep,
  PublicFamily,
  PublicParent,
  PublicStudent,
  SessionView,
} from "@/lib/auth/types";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD = 6;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toPublicParent(p: {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}): PublicParent {
  return {
    id: p.id,
    email: p.email,
    displayName: p.displayName,
    emailVerified: p.emailVerified,
  };
}

function computeStep(input: {
  emailVerified: boolean;
  profileCompleted: boolean;
  family: PublicFamily | null;
  student: PublicStudent | null;
}): OnboardingStep {
  if (!input.emailVerified) return "verify_email";
  if (!input.profileCompleted) return "parent_profile";
  if (!input.family) return "create_family";
  if (!input.student) return "invite_student";
  return "complete";
}

export class ParentSignupService {
  constructor(
    private readonly store: AuthStore,
    private readonly verification: EmailVerificationProvider,
  ) {}

  async signUp(input: {
    parentName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ sessionToken: string; session: SessionView; expiresAt: string }> {
    const name = input.parentName.trim();
    const email = input.email.trim().toLowerCase();
    if (!name) throw new AuthError("INVALID_INPUT");
    if (!isValidEmail(email)) throw new AuthError("INVALID_EMAIL");
    if (input.password.length < MIN_PASSWORD) {
      throw new AuthError("PASSWORD_TOO_SHORT");
    }
    if (input.password !== input.confirmPassword) {
      throw new AuthError("PASSWORD_MISMATCH");
    }

    const snap = await this.store.read();
    if (findParentByEmail(snap, email)) throw new AuthError("EMAIL_TAKEN");

    const now = new Date();
    const parent = {
      id: newId("par"),
      email,
      passwordHash: hashPassword(input.password),
      displayName: name,
      emailVerified: false,
      profileCompleted: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    snap.parents.push(parent);

    const sessionToken = newSessionToken();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    snap.sessions.push({
      token: sessionToken,
      parentId: parent.id,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    await this.attachVerificationChallenge(snap, parent.id, parent.email);
    await this.store.write(snap);

    return {
      sessionToken,
      expiresAt: expiresAt.toISOString(),
      session: this.buildSessionView(snap, parent.id),
    };
  }

  async resendVerification(
    sessionToken: string,
  ): Promise<{ expiresAt: string }> {
    const { snap, parent } = await this.requireParent(sessionToken);
    if (parent.emailVerified) {
      return { expiresAt: new Date().toISOString() };
    }
    const delivery = await this.attachVerificationChallenge(
      snap,
      parent.id,
      parent.email,
    );
    await this.store.write(snap);
    return { expiresAt: delivery.expiresAt };
  }

  async verifyEmail(sessionToken: string, code: string): Promise<SessionView> {
    const trimmed = code.trim();
    if (!trimmed) throw new AuthError("INVALID_CODE");

    const { snap, parent } = await this.requireParent(sessionToken);
    if (parent.emailVerified) {
      return this.buildSessionView(snap, parent.id);
    }

    const challenge = findChallenge(snap, parent.id);
    if (!challenge) throw new AuthError("INVALID_CODE");
    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      throw new AuthError("CODE_EXPIRED");
    }
    if (!verifyOpaque(trimmed, challenge.codeHash)) {
      throw new AuthError("INVALID_CODE");
    }

    parent.emailVerified = true;
    parent.updatedAt = new Date().toISOString();
    snap.challenges = snap.challenges.filter((c) => c.parentId !== parent.id);
    await this.store.write(snap);
    return this.buildSessionView(snap, parent.id);
  }

  async updateProfile(
    sessionToken: string,
    input: { displayName: string },
  ): Promise<SessionView> {
    const { snap, parent } = await this.requireParent(sessionToken);
    if (!parent.emailVerified) throw new AuthError("EMAIL_NOT_VERIFIED");
    const displayName = input.displayName.trim();
    if (!displayName) throw new AuthError("INVALID_INPUT");
    parent.displayName = displayName;
    parent.profileCompleted = true;
    parent.updatedAt = new Date().toISOString();
    await this.store.write(snap);
    return this.buildSessionView(snap, parent.id);
  }

  async createFamily(
    sessionToken: string,
    input: { familyName?: string },
  ): Promise<SessionView> {
    const { snap, parent } = await this.requireParent(sessionToken);
    if (!parent.emailVerified) throw new AuthError("EMAIL_NOT_VERIFIED");
    if (!parent.profileCompleted) throw new AuthError("INVALID_INPUT");
    if (findFamilyByOwner(snap, parent.id)) throw new AuthError("FAMILY_EXISTS");

    const name =
      input.familyName?.trim() || `${parent.displayName} 的家庭`;
    snap.families.push({
      id: newId("fam"),
      ownerParentId: parent.id,
      name,
      createdAt: new Date().toISOString(),
    });
    await this.store.write(snap);
    return this.buildSessionView(snap, parent.id);
  }

  async inviteStudent(
    sessionToken: string,
    input: { studentName: string; grade?: string },
  ): Promise<SessionView> {
    const { snap, parent } = await this.requireParent(sessionToken);
    if (!parent.emailVerified) throw new AuthError("EMAIL_NOT_VERIFIED");
    if (!parent.profileCompleted) throw new AuthError("INVALID_INPUT");
    const family = findFamilyByOwner(snap, parent.id);
    if (!family) throw new AuthError("NO_FAMILY");
    if (findStudentByFamily(snap, family.id)) {
      throw new AuthError("STUDENT_EXISTS");
    }

    const studentName = input.studentName.trim();
    if (!studentName) throw new AuthError("INVALID_INPUT");
    const grade = input.grade?.trim() || undefined;

    snap.students.push({
      id: newId("stu"),
      familyId: family.id,
      name: studentName,
      grade,
      invitedAt: new Date().toISOString(),
    });
    await this.store.write(snap);
    return this.buildSessionView(snap, parent.id);
  }

  async getSession(sessionToken: string): Promise<SessionView | null> {
    const snap = await this.store.read();
    const session = findSession(snap, sessionToken);
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) return null;
    const parent = findParentById(snap, session.parentId);
    if (!parent) return null;
    return this.buildSessionView(snap, parent.id);
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<{ sessionToken: string; session: SessionView; expiresAt: string }> {
    const email = input.email.trim().toLowerCase();
    if (!isValidEmail(email)) throw new AuthError("INVALID_EMAIL");
    const snap = await this.store.read();
    const parent = findParentByEmail(snap, email);
    if (!parent || !verifyPassword(input.password, parent.passwordHash)) {
      throw new AuthError("INVALID_CREDENTIALS");
    }
    const now = new Date();
    const sessionToken = newSessionToken();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    snap.sessions.push({
      token: sessionToken,
      parentId: parent.id,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
    await this.store.write(snap);
    return {
      sessionToken,
      expiresAt: expiresAt.toISOString(),
      session: this.buildSessionView(snap, parent.id),
    };
  }

  private async attachVerificationChallenge(
    snap: AuthStoreSnapshot,
    parentId: string,
    email: string,
  ) {
    const issued = await this.verification.issueCode({ parentId, email });
    snap.challenges = snap.challenges.filter((c) => c.parentId !== parentId);
    snap.challenges.push({
      parentId,
      codeHash: hashOpaque(issued.code),
      expiresAt: issued.expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    });
    return this.verification.deliverCode({
      email,
      code: issued.code,
      expiresAt: issued.expiresAt,
    });
  }

  private async requireParent(sessionToken: string) {
    const snap = await this.store.read();
    const session = findSession(snap, sessionToken);
    if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
      throw new AuthError("UNAUTHORIZED");
    }
    const parent = findParentById(snap, session.parentId);
    if (!parent) throw new AuthError("UNAUTHORIZED");
    // Backfill for older snapshots written before profileCompleted existed
    if (typeof parent.profileCompleted !== "boolean") {
      parent.profileCompleted = Boolean(parent.displayName?.trim());
    }
    return { snap, parent, session };
  }

  private buildSessionView(
    snap: AuthStoreSnapshot,
    parentId: string,
  ): SessionView {
    const parent = findParentById(snap, parentId);
    if (!parent) throw new AuthError("UNAUTHORIZED");
    const profileCompleted =
      typeof parent.profileCompleted === "boolean"
        ? parent.profileCompleted
        : Boolean(parent.displayName?.trim());

    const familyRec = findFamilyByOwner(snap, parentId);
    const family: PublicFamily | null = familyRec
      ? { id: familyRec.id, name: familyRec.name }
      : null;
    const studentRec = familyRec
      ? findStudentByFamily(snap, familyRec.id)
      : undefined;
    const student: PublicStudent | null = studentRec
      ? {
          id: studentRec.id,
          name: studentRec.name,
          grade: studentRec.grade,
        }
      : null;

    return {
      parent: toPublicParent(parent),
      family,
      student,
      onboardingStep: computeStep({
        emailVerified: parent.emailVerified,
        profileCompleted,
        family,
        student,
      }),
    };
  }
}
