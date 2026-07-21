/**
 * Split Tutor replies into speakable sentence chunks (stream-ready later).
 */

export function splitTutorSentences(text: string): string[] {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return [];

  const parts: string[] = [];
  let buf = "";
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]!;
    buf += ch;
    if (/[.!?…。！？]/.test(ch)) {
      const next = trimmed[i + 1];
      if (next == null || /\s/.test(next)) {
        const piece = buf.trim();
        if (piece) parts.push(piece);
        buf = "";
        while (i + 1 < trimmed.length && /\s/.test(trimmed[i + 1]!)) i++;
      }
    }
  }
  if (buf.trim()) parts.push(buf.trim());

  if (parts.length === 0) return [trimmed];

  const merged: string[] = [];
  for (const part of parts) {
    const prev = merged[merged.length - 1];
    if (prev && part.length < 8) {
      merged[merged.length - 1] = `${prev} ${part}`;
    } else {
      merged.push(part);
    }
  }
  return merged.length > 0 ? merged : [trimmed];
}
