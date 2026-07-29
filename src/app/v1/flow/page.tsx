"use client";

import Link from "next/link";
import { useState } from "react";

import {
  SsAiChatBubble,
  SsAppShell,
  SsButton,
  SsCameraButton,
  SsCard,
  SsInput,
  SsMicButton,
  SsPageHeader,
} from "@/design-system";
import { mockFlowChat, mockFlowSteps } from "@/design-system/mock/data";

export default function LearningFlowPage() {
  const [micActive, setMicActive] = useState(false);
  const currentIndex = mockFlowSteps.findIndex((s) => s.current);

  return (
    <SsAppShell>
      <SsPageHeader
        title="看圖說句子"
        subtitle="練習中 · 完成後回到今日目標"
        backHref="/v1/goals"
      />

      <div className="mb-6 flex items-center gap-2">
        {mockFlowSteps.map((step, i) => (
          <div key={step.id} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`h-1.5 w-full rounded-full ${
                step.done || step.current
                  ? "bg-[var(--ss-primary)]"
                  : "bg-[var(--ss-border)]"
              } ${step.current ? "opacity-100" : step.done ? "opacity-80" : ""}`}
            />
            <span
              className={`text-[11px] font-medium ${
                i === currentIndex
                  ? "text-[var(--ss-primary)]"
                  : "text-[var(--ss-fg-muted)]"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <SsCard className="mb-4 overflow-hidden p-0">
        <div
          className="flex h-40 items-center justify-center bg-gradient-to-br from-[var(--ss-primary-soft)] to-[var(--ss-ai-soft)] text-sm text-[var(--ss-fg-muted)]"
          aria-label="練習圖片預覽"
        >
          公園 · 放風箏（示意）
        </div>
      </SsCard>

      <div className="mb-6 flex flex-col gap-3">
        {mockFlowChat.map((msg, i) => (
          <SsAiChatBubble key={i} role={msg.role}>
            {msg.text}
          </SsAiChatBubble>
        ))}
      </div>

      <SsCard className="mb-4">
        <label className="mb-2 block text-sm font-medium text-[var(--ss-fg-muted)]">
          你的回答
        </label>
        <SsInput placeholder="輸入或用麥克風說出來…" readOnly defaultValue="" />
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <SsCameraButton />
            <span className="text-xs text-[var(--ss-fg-muted)]">拍作業</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <SsMicButton
              active={micActive}
              onClick={() => setMicActive((v) => !v)}
            />
            <span className="text-xs text-[var(--ss-fg-muted)]">
              {micActive ? "錄音中" : "開口說"}
            </span>
          </div>
        </div>
      </SsCard>

      <div className="flex flex-col gap-2">
        <Link href="/v1/goals" className="block">
          <SsButton className="w-full">完成這一步</SsButton>
        </Link>
        <Link href="/v1/dashboard" className="block">
          <SsButton variant="ghost" className="w-full">
            回到今天
          </SsButton>
        </Link>
      </div>
    </SsAppShell>
  );
}
