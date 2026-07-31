import { describe, expect, it } from "vitest";

import { AuthError } from "@/lib/auth/errors";
import { FixedCodeEmailVerificationProvider } from "@/lib/auth/emailVerification/FixedCodeEmailVerificationProvider";
import { ParentSignupService } from "@/lib/auth/ParentSignupService";
import { MemoryAuthStore } from "@/lib/auth/store/MemoryAuthStore";

function makeService(code = "123456") {
  const provider = new FixedCodeEmailVerificationProvider(code);
  const service = new ParentSignupService(new MemoryAuthStore(), provider);
  return { service, provider };
}

describe("ParentSignupService (PRD-001)", () => {
  it("signs up and lands on verify_email (not complete)", async () => {
    const { service, provider } = makeService();
    const { session } = await service.signUp({
      parentName: "王媽媽",
      email: "parent@example.com",
      password: "secret1",
      confirmPassword: "secret1",
    });

    expect(session.onboardingStep).toBe("verify_email");
    expect(session.parent.emailVerified).toBe(false);
    expect(session.family).toBeNull();
    expect(session.student).toBeNull();
    expect(provider.deliveries).toHaveLength(1);
    expect(provider.deliveries[0]?.code).toBe("123456");
  });

  it("rejects invalid signup inputs with calm codes", async () => {
    const { service } = makeService();

    await expect(
      service.signUp({
        parentName: "王媽媽",
        email: "not-an-email",
        password: "secret1",
        confirmPassword: "secret1",
      }),
    ).rejects.toMatchObject({ code: "INVALID_EMAIL" });

    await expect(
      service.signUp({
        parentName: "王媽媽",
        email: "a@example.com",
        password: "short",
        confirmPassword: "short",
      }),
    ).rejects.toMatchObject({ code: "PASSWORD_TOO_SHORT" });

    await expect(
      service.signUp({
        parentName: "王媽媽",
        email: "a@example.com",
        password: "secret1",
        confirmPassword: "secret2",
      }),
    ).rejects.toMatchObject({ code: "PASSWORD_MISMATCH" });
  });

  it("blocks invite before email verification (AC6)", async () => {
    const { service } = makeService();
    const { sessionToken } = await service.signUp({
      parentName: "王媽媽",
      email: "gate@example.com",
      password: "secret1",
      confirmPassword: "secret1",
    });

    await expect(
      service.inviteStudent(sessionToken, { studentName: "小明" }),
    ).rejects.toBeInstanceOf(AuthError);

    await expect(
      service.inviteStudent(sessionToken, { studentName: "小明" }),
    ).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });

    await expect(
      service.createFamily(sessionToken, {}),
    ).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  it("completes linear domain path: verify → profile → family → invite", async () => {
    const { service } = makeService("654321");
    const { sessionToken } = await service.signUp({
      parentName: "王媽媽",
      email: "flow@example.com",
      password: "secret1",
      confirmPassword: "secret1",
    });

    let session = await service.verifyEmail(sessionToken, "654321");
    expect(session.onboardingStep).toBe("parent_profile");
    expect(session.parent.emailVerified).toBe(true);

    session = await service.updateProfile(sessionToken, {
      displayName: "王媽媽",
    });
    expect(session.onboardingStep).toBe("create_family");

    session = await service.createFamily(sessionToken, {});
    expect(session.onboardingStep).toBe("invite_student");
    expect(session.family?.name).toBe("王媽媽 的家庭");
    expect(session.family?.id).toBeTruthy();

    session = await service.inviteStudent(sessionToken, {
      studentName: "小明",
      grade: "小三",
    });
    expect(session.onboardingStep).toBe("complete");
    expect(session.student?.name).toBe("小明");
    expect(session.student?.grade).toBe("小三");
    expect(session.student?.id).toBeTruthy();
  });

  it("rejects wrong verification code and allows retry", async () => {
    const { service } = makeService("111111");
    const { sessionToken } = await service.signUp({
      parentName: "王媽媽",
      email: "retry@example.com",
      password: "secret1",
      confirmPassword: "secret1",
    });

    await expect(
      service.verifyEmail(sessionToken, "000000"),
    ).rejects.toMatchObject({ code: "INVALID_CODE" });

    const session = await service.verifyEmail(sessionToken, "111111");
    expect(session.parent.emailVerified).toBe(true);
  });

  it("attaches student under the parent-owned family only", async () => {
    const { service } = makeService("222222");
    const a = await service.signUp({
      parentName: "家長A",
      email: "a@example.com",
      password: "secret1",
      confirmPassword: "secret1",
    });
    await service.verifyEmail(a.sessionToken, "222222");
    await service.updateProfile(a.sessionToken, { displayName: "家長A" });
    await service.createFamily(a.sessionToken, { familyName: "A家" });
    const done = await service.inviteStudent(a.sessionToken, {
      studentName: "孩子A",
    });

    expect(done.family?.name).toBe("A家");
    expect(done.student?.name).toBe("孩子A");

    await expect(
      service.inviteStudent(a.sessionToken, { studentName: "另一個" }),
    ).rejects.toMatchObject({ code: "STUDENT_EXISTS" });
  });
});
