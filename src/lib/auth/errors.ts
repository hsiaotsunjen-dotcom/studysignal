export type AuthErrorCode =
  | "INVALID_EMAIL"
  | "PASSWORD_TOO_SHORT"
  | "PASSWORD_MISMATCH"
  | "EMAIL_TAKEN"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "INVALID_CODE"
  | "CODE_EXPIRED"
  | "FAMILY_EXISTS"
  | "NO_FAMILY"
  | "STUDENT_EXISTS"
  | "UNAUTHORIZED"
  | "INVALID_INPUT"
  | "STORE_UNAVAILABLE";

/** Calm, non-blameful messages for clients (PRD-001 AC2). */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_EMAIL: "請輸入有效的 Email。",
  PASSWORD_TOO_SHORT: "密碼至少需要 6 個字元。",
  PASSWORD_MISMATCH: "兩次輸入的密碼不一致。",
  EMAIL_TAKEN: "這個 Email 已經註冊過了，請直接登入。",
  INVALID_CREDENTIALS: "Email 或密碼不正確。",
  EMAIL_NOT_VERIFIED: "請先完成信箱驗證，再繼續建立家庭。",
  INVALID_CODE: "驗證碼不正確，請再試一次。",
  CODE_EXPIRED: "驗證碼已過期，請重新取得一組新的。",
  FAMILY_EXISTS: "家庭已經建立好了。",
  NO_FAMILY: "請先建立家庭，再邀請孩子。",
  STUDENT_EXISTS: "這個家庭已經邀請過孩子了。",
  UNAUTHORIZED: "請先登入後再繼續。",
  INVALID_INPUT: "請檢查一下輸入內容。",
  STORE_UNAVAILABLE: "暫時無法儲存資料，請稍后再試。",
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(AUTH_ERROR_MESSAGES[code]);
    this.name = "AuthError";
    this.code = code;
  }
}
