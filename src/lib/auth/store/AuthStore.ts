import type {
  AuthStoreSnapshot,
  Family,
  ParentAccount,
  SessionRecord,
  StudentMember,
  VerificationChallenge,
} from "@/lib/auth/types";

export interface AuthStore {
  read(): Promise<AuthStoreSnapshot>;
  write(snapshot: AuthStoreSnapshot): Promise<void>;
}

export function emptySnapshot(): AuthStoreSnapshot {
  return {
    parents: [],
    families: [],
    students: [],
    sessions: [],
    challenges: [],
  };
}

export async function withStoreMutation<T>(
  store: AuthStore,
  mutator: (snap: AuthStoreSnapshot) => T,
): Promise<T> {
  const snap = await store.read();
  const result = mutator(snap);
  await store.write(snap);
  return result;
}

export function findParentByEmail(
  snap: AuthStoreSnapshot,
  email: string,
): ParentAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return snap.parents.find((p) => p.email === normalized);
}

export function findParentById(
  snap: AuthStoreSnapshot,
  id: string,
): ParentAccount | undefined {
  return snap.parents.find((p) => p.id === id);
}

export function findFamilyByOwner(
  snap: AuthStoreSnapshot,
  parentId: string,
): Family | undefined {
  return snap.families.find((f) => f.ownerParentId === parentId);
}

export function findStudentByFamily(
  snap: AuthStoreSnapshot,
  familyId: string,
): StudentMember | undefined {
  return snap.students.find((s) => s.familyId === familyId);
}

export function findSession(
  snap: AuthStoreSnapshot,
  token: string,
): SessionRecord | undefined {
  return snap.sessions.find((s) => s.token === token);
}

export function findChallenge(
  snap: AuthStoreSnapshot,
  parentId: string,
): VerificationChallenge | undefined {
  return snap.challenges.find((c) => c.parentId === parentId);
}
