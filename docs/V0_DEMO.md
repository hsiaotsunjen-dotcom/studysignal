# StudySignal V0 Demo

> 目標：一條可從頭走到尾、不需解說的產品體驗。  
> 不追求功能完整，追求 believable。

## Happy path

```text
/  Landing → 開始免費使用
→ /v1/signup  Parent Sign Up（姓名 / Email / 密碼 / 確認密碼）→ localStorage
→ /v1/student/new  Create Student
→ /v1/dashboard  Student Home
→ /v1/flow  Daily Learning Session
→ Learning Signals（session 內）
→ /v1/parent  Parent Dashboard（顯示註冊 Email）
→ /v1/parent/email  Daily Email Preview（顯示「Today this report would be sent to: …」）
```

## Notes

- Mock data + localStorage is intentional.
- 「開始免費使用」會清除舊示範狀態，確保可重跑。
- `/v1/onboarding` 已收斂進 Create Student → Student Home。
- Bottom tabs（V0）：今天 · 學習 · 家長
