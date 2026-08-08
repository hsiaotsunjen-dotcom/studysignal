const PARENT_ENTRY_KEY = "studysignal.parentEntry.v1";

export type ParentEntryPlaceholder = {
  displayName: string;
  enteredAt: string;
};

export function readParentEntryPlaceholder(): ParentEntryPlaceholder | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PARENT_ENTRY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ParentEntryPlaceholder;
  } catch {
    return null;
  }
}

export function writeParentEntryPlaceholder(
  entry: ParentEntryPlaceholder,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PARENT_ENTRY_KEY, JSON.stringify(entry));
}
