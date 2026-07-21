import { describe, expect, it } from "vitest";

import {
  DEFAULT_TEACHER_VOICE_PROFILE_ID,
  TEACHER_VOICE_CATALOG,
  getTeacherVoiceProfile,
  listPublicTeacherVoiceProfiles,
  normalizeTeacherVoiceProfileId,
  resolveProviderVoiceName,
  toPublicTeacherVoiceProfile,
} from "@/lib/tts/catalog";

describe("Teacher Voice Catalog", () => {
  it("contains required stable teacher ids", () => {
    const ids = TEACHER_VOICE_CATALOG.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "teacher_female_tw",
        "teacher_female_us",
        "teacher_female_uk",
        "teacher_male_tw",
        "teacher_male_us",
        "teacher_male_uk",
        "future_teacher",
      ]),
    );
    expect(DEFAULT_TEACHER_VOICE_PROFILE_ID).toBe("teacher_female_tw");
  });

  it("normalizes legacy aliases to canonical ids", () => {
    expect(normalizeTeacherVoiceProfileId("teacher_female")).toBe(
      "teacher_female_tw",
    );
    expect(normalizeTeacherVoiceProfileId("teacher_american")).toBe(
      "teacher_female_us",
    );
    expect(normalizeTeacherVoiceProfileId("teacher_british")).toBe(
      "teacher_female_uk",
    );
    expect(normalizeTeacherVoiceProfileId("teacher_chinese")).toBe(
      "teacher_female_tw",
    );
    expect(normalizeTeacherVoiceProfileId(undefined)).toBe(
      "teacher_female_tw",
    );
  });

  it("rejects unknown ids", () => {
    expect(normalizeTeacherVoiceProfileId("nova")).toBeNull();
    expect(normalizeTeacherVoiceProfileId("onyx")).toBeNull();
    expect(getTeacherVoiceProfile("not_a_teacher")).toBeNull();
  });

  it("resolves provider voice names only through catalog (openai)", () => {
    expect(resolveProviderVoiceName("teacher_female_us", "openai")).toBe(
      "nova",
    );
    expect(resolveProviderVoiceName("teacher_male_us", "openai")).toBe(
      "onyx",
    );
    expect(resolveProviderVoiceName("teacher_female_uk", "openai")).toBe(
      "fable",
    );
    // Alias input still resolves via normalize inside requireTeacherVoiceProfile path
    expect(resolveProviderVoiceName("teacher_female", "openai")).toBe("nova");
  });

  it("strips provider mappings from public projection", () => {
    const pub = listPublicTeacherVoiceProfiles();
    expect(pub.length).toBe(TEACHER_VOICE_CATALOG.length);
    for (const p of pub) {
      expect(p).not.toHaveProperty("providerVoiceMapping");
      expect(p).not.toHaveProperty("notes");
      expect(p.id).toBeTruthy();
      expect(p.displayName).toBeTruthy();
      expect(p.locale).toBeTruthy();
    }

    const full = getTeacherVoiceProfile("teacher_female_tw")!;
    const one = toPublicTeacherVoiceProfile(full);
    expect(one).not.toHaveProperty("providerVoiceMapping");
    expect(JSON.stringify(one)).not.toMatch(/nova|onyx|fable|alloy/i);
  });

  it("every catalog entry has required metadata fields", () => {
    for (const p of TEACHER_VOICE_CATALOG) {
      expect(p.id).toBeTruthy();
      expect(p.displayName.length).toBeGreaterThan(0);
      expect(p.language.length).toBeGreaterThan(0);
      expect(p.locale.length).toBeGreaterThan(0);
      expect(["female", "male", "neutral"]).toContain(p.gender);
      expect(p.speakingStyle).toBeTruthy();
      expect(p.defaultSpeed).toBeGreaterThan(0);
      expect(p.providerVoiceMapping.openai).toBeTruthy();
    }
  });
});
