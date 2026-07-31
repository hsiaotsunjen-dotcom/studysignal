import { mkdir, readFile, rename, unlink, writeFile } from "fs/promises";
import path from "path";

import { AuthError } from "@/lib/auth/errors";
import {
  emptySnapshot,
  type AuthStore,
} from "@/lib/auth/store/AuthStore";
import type { AuthStoreSnapshot } from "@/lib/auth/types";

const DEFAULT_RELATIVE = path.join(".data", "prd001-auth-store.json");

/** Serialize store mutations within one Node process to avoid truncated JSON. */
let writeChain: Promise<void> = Promise.resolve();

export class FileAuthStore implements AuthStore {
  private readonly filePath: string;

  constructor(filePath = path.join(process.cwd(), DEFAULT_RELATIVE)) {
    this.filePath = filePath;
  }

  async read(): Promise<AuthStoreSnapshot> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      if (!raw.trim()) return emptySnapshot();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return emptySnapshot();
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return emptySnapshot();
      }
      const snap = parsed as Partial<AuthStoreSnapshot>;
      return {
        parents: Array.isArray(snap.parents) ? snap.parents : [],
        families: Array.isArray(snap.families) ? snap.families : [],
        students: Array.isArray(snap.students) ? snap.students : [],
        sessions: Array.isArray(snap.sessions) ? snap.sessions : [],
        challenges: Array.isArray(snap.challenges) ? snap.challenges : [],
      };
    } catch (err) {
      if (err instanceof AuthError) throw err;
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return emptySnapshot();
      throw new AuthError("STORE_UNAVAILABLE");
    }
  }

  async write(snapshot: AuthStoreSnapshot): Promise<void> {
    const job = writeChain.then(() => this.writeAtomic(snapshot));
    writeChain = job.then(
      () => undefined,
      () => undefined,
    );
    try {
      await job;
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError("STORE_UNAVAILABLE");
    }
  }

  private async writeAtomic(snapshot: AuthStoreSnapshot): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const payload = JSON.stringify(snapshot, null, 2);
    await writeFile(tmp, payload, "utf8");
    try {
      await rename(tmp, this.filePath);
    } catch {
      // Windows may reject rename over an existing file — replace in place.
      await writeFile(this.filePath, payload, "utf8");
      try {
        await unlink(tmp);
      } catch {
        // ignore temp cleanup
      }
    }
  }
}
