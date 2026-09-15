"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SsAppShell, SsButton, SsInput } from "@/design-system";
import {
  enterDemoMode,
  isDemoAuthEnabled,
} from "@/lib/demoAuth";
import { writeParentEntryPlaceholder } from "@/lib/learning/parentEntry";

/**
 * PRD-101.5 — Parent entry placeholder.
 * Full auth can still use /v1/login / signup; this path lets a parent
 * enter the Insight foundation without becoming the learning owner.
 */
export default function ParentEntryPage() {
  const router = useRouter();
  const [name, setName] = useState("");

  function continueToInsight() {
    const displayName = name.trim() || "家長";
    writeParentEntryPlaceholder({
      displayName,
      enteredAt: new Date().toISOString(),
    });
    if (isDemoAuthEnabled()) {
      enterDemoMode();
    }
    router.push("/v1/parent/insight");
  }

  return (
    <SsAppShell showTab={false}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-8 pt-2">
        <header>
          <p className="text-[12px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
            家長入口
          </p>
          <h1
            className="mt-3 text-[1.75rem] font-semibold text-[var(--ss-fg)]"
            style={{
              fontFamily:
                "var(--font-ss-display), var(--font-ss-sans), system-ui",
              letterSpacing: "var(--ss-tracking-display)",
              lineHeight: "1.28",
            }}
          >
            了解孩子的學習
          </h1>
          <p
            className="mt-4 text-[15px] text-[var(--ss-fg-muted)]"
            style={{ lineHeight: "var(--ss-leading-body)" }}
          >
            這裡會告訴你孩子最近學得怎麼樣、哪裡需要支持——不是監看對話，也不用分數定義孩子。
          </p>
        </header>

        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="text-[13px] text-[var(--ss-fg-muted)]">
              怎麼稱呼你（可選）
            </span>
            <SsInput
              placeholder="例如：王媽媽"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <SsButton className="w-full" onClick={() => continueToInsight()}>
            查看學習洞察
          </SsButton>
        </div>

        <div className="space-y-3 border-t border-[var(--ss-border)]/40 pt-6 text-center text-[14px] text-[var(--ss-fg-muted)]">
          <p>
            已有家長帳號？{" "}
            <Link
              href="/v1/login"
              className="font-semibold text-[var(--ss-primary)] hover:opacity-80"
            >
              登入
            </Link>
          </p>
          <p>
            我是學生？{" "}
            <Link
              href="/v1/learn/onboarding?entry=new"
              className="font-semibold text-[var(--ss-primary)] hover:opacity-80"
            >
              開始學習
            </Link>
          </p>
        </div>
      </div>
    </SsAppShell>
  );
}
