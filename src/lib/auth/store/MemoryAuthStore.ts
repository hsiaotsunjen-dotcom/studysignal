import {
  emptySnapshot,
  type AuthStore,
} from "@/lib/auth/store/AuthStore";
import type { AuthStoreSnapshot } from "@/lib/auth/types";

/** In-memory store for unit tests */
export class MemoryAuthStore implements AuthStore {
  private snapshot: AuthStoreSnapshot = emptySnapshot();

  async read(): Promise<AuthStoreSnapshot> {
    return structuredClone(this.snapshot);
  }

  async write(snapshot: AuthStoreSnapshot): Promise<void> {
    this.snapshot = structuredClone(snapshot);
  }
}
