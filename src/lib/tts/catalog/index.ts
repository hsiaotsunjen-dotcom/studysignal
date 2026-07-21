/**
 * Teacher Voice Catalog — public exports.
 */

export type {
  ProviderVoiceMapping,
  PublicTeacherVoiceProfile,
  TeacherSpeakingStyle,
  TeacherVoiceGender,
  TeacherVoiceProfile,
  TeacherVoiceProfileId,
} from "@/lib/tts/catalog/types";

export {
  DEFAULT_TEACHER_VOICE_PROFILE_ID,
  TEACHER_VOICE_CATALOG,
  TEACHER_VOICE_PROFILE_ALIASES,
  getTeacherVoiceProfile,
  isTeacherVoiceProfileId,
  listPublicTeacherVoiceProfiles,
  listTeacherVoiceProfiles,
  normalizeTeacherVoiceProfileId,
  requireTeacherVoiceProfile,
  resolveProviderVoiceName,
  toPublicTeacherVoiceProfile,
} from "@/lib/tts/catalog/teacherVoiceCatalog";
