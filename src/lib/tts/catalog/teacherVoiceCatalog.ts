/**
 * Permanent Teacher Voice Catalog data + resolution helpers.
 *
 * Voice profile IDs are stable forever. Swap OpenAI/Gemini/Azure/ElevenLabs
 * voice names only inside providerVoiceMapping — never change the id.
 */

import type { TtsProviderId } from "@/lib/tts/TtsProvider";
import type {
  PublicTeacherVoiceProfile,
  TeacherVoiceProfile,
  TeacherVoiceProfileId,
} from "@/lib/tts/catalog/types";

/**
 * Canonical catalog. Add rows for new teachers; do not rename existing ids.
 *
 * OpenAI mappings use current tts-1 voices (nova, onyx, fable, alloy, …).
 * Gemini / Azure / ElevenLabs / local slots are reserved for future adapters.
 */
export const TEACHER_VOICE_CATALOG: readonly TeacherVoiceProfile[] = [
  {
    id: "teacher_female_tw",
    displayName: "Teacher · Female · Taiwan",
    language: "zh",
    locale: "zh-TW",
    gender: "female",
    speakingStyle: "warm_teacher",
    defaultSpeed: 1,
    providerVoiceMapping: {
      openai: "nova",
      // gemini / azure / elevenlabs filled when those adapters ship
    },
    notes: "Default StudySignal companion voice for zh-TW contexts.",
  },
  {
    id: "teacher_female_us",
    displayName: "Teacher · Female · American English",
    language: "en",
    locale: "en-US",
    gender: "female",
    speakingStyle: "warm_teacher",
    defaultSpeed: 1,
    providerVoiceMapping: {
      openai: "nova",
    },
  },
  {
    id: "teacher_female_uk",
    displayName: "Teacher · Female · British English",
    language: "en",
    locale: "en-GB",
    gender: "female",
    speakingStyle: "clear_instructor",
    defaultSpeed: 1,
    providerVoiceMapping: {
      openai: "fable",
    },
  },
  {
    id: "teacher_male_tw",
    displayName: "Teacher · Male · Taiwan",
    language: "zh",
    locale: "zh-TW",
    gender: "male",
    speakingStyle: "clear_instructor",
    defaultSpeed: 1,
    providerVoiceMapping: {
      openai: "onyx",
    },
  },
  {
    id: "teacher_male_us",
    displayName: "Teacher · Male · American English",
    language: "en",
    locale: "en-US",
    gender: "male",
    speakingStyle: "clear_instructor",
    defaultSpeed: 1,
    providerVoiceMapping: {
      openai: "onyx",
    },
  },
  {
    id: "teacher_male_uk",
    displayName: "Teacher · Male · British English",
    language: "en",
    locale: "en-GB",
    gender: "male",
    speakingStyle: "calm_narrator",
    defaultSpeed: 1,
    providerVoiceMapping: {
      openai: "echo",
    },
  },
  {
    id: "future_teacher",
    displayName: "Future Teacher (placeholder)",
    language: "multi",
    locale: "und",
    gender: "neutral",
    speakingStyle: "future",
    defaultSpeed: 1,
    providerVoiceMapping: {
      openai: "alloy",
    },
    notes: "Reserved stable id for upcoming branded / multilingual teacher.",
  },
] as const;

/** Production default teacher id (stable). */
export const DEFAULT_TEACHER_VOICE_PROFILE_ID: TeacherVoiceProfileId =
  "teacher_female_tw";

/**
 * Legacy M1/M2 ids → canonical Teacher Voice Catalog ids.
 * Kept forever so old clients keep working without UI changes.
 */
export const TEACHER_VOICE_PROFILE_ALIASES: Readonly<
  Record<string, TeacherVoiceProfileId>
> = {
  teacher_female: "teacher_female_tw",
  teacher_male: "teacher_male_us",
  teacher_british: "teacher_female_uk",
  teacher_american: "teacher_female_us",
  teacher_chinese: "teacher_female_tw",
  // Explicit passthroughs (documentation / tooling)
  teacher_female_tw: "teacher_female_tw",
  teacher_female_us: "teacher_female_us",
  teacher_female_uk: "teacher_female_uk",
  teacher_male_tw: "teacher_male_tw",
  teacher_male_us: "teacher_male_us",
  teacher_male_uk: "teacher_male_uk",
  future_teacher: "future_teacher",
};

const BY_ID: Map<TeacherVoiceProfileId, TeacherVoiceProfile> = new Map(
  TEACHER_VOICE_CATALOG.map((p) => [p.id, p]),
);

export function isTeacherVoiceProfileId(
  raw: string,
): raw is TeacherVoiceProfileId {
  return BY_ID.has(raw as TeacherVoiceProfileId);
}

/**
 * Normalize any accepted client id / alias → canonical TeacherVoiceProfileId.
 * Returns null if unknown (callers should 400).
 */
export function normalizeTeacherVoiceProfileId(
  raw: string | null | undefined,
): TeacherVoiceProfileId | null {
  if (raw == null) return DEFAULT_TEACHER_VOICE_PROFILE_ID;
  const key = raw.trim();
  if (!key) return DEFAULT_TEACHER_VOICE_PROFILE_ID;
  const aliased = TEACHER_VOICE_PROFILE_ALIASES[key];
  if (aliased) return aliased;
  if (isTeacherVoiceProfileId(key)) return key;
  return null;
}

export function getTeacherVoiceProfile(
  id: TeacherVoiceProfileId | string,
): TeacherVoiceProfile | null {
  const canonical = normalizeTeacherVoiceProfileId(id);
  if (!canonical) return null;
  return BY_ID.get(canonical) ?? null;
}

export function requireTeacherVoiceProfile(
  id: TeacherVoiceProfileId | string,
): TeacherVoiceProfile {
  const profile = getTeacherVoiceProfile(id);
  if (!profile) {
    throw new Error(
      `TeacherVoiceCatalog: unknown voiceProfileId "${String(id)}"`,
    );
  }
  return profile;
}

export function listTeacherVoiceProfiles(): readonly TeacherVoiceProfile[] {
  return TEACHER_VOICE_CATALOG;
}

/** Public list for future settings UI — provider mappings stripped. */
export function listPublicTeacherVoiceProfiles(): PublicTeacherVoiceProfile[] {
  return TEACHER_VOICE_CATALOG.map(
    ({ providerVoiceMapping: _m, notes: _n, ...pub }) => pub,
  );
}

export function toPublicTeacherVoiceProfile(
  profile: TeacherVoiceProfile,
): PublicTeacherVoiceProfile {
  const { providerVoiceMapping: _m, notes: _n, ...pub } = profile;
  return pub;
}

/**
 * Resolve vendor voice name for an adapter.
 * ONLY call from inside a TtsProvider implementation.
 */
export function resolveProviderVoiceName(
  voiceProfileId: string,
  providerId: TtsProviderId,
): string {
  const profile = requireTeacherVoiceProfile(voiceProfileId);
  const vendorVoice = profile.providerVoiceMapping[providerId];
  if (!vendorVoice || !vendorVoice.trim()) {
    throw new Error(
      `TeacherVoiceCatalog: no ${providerId} voice mapping for "${profile.id}"`,
    );
  }
  return vendorVoice.trim();
}
