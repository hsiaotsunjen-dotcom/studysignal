"use client";

import { useCallback, useEffect, useState } from "react";

import { speakWithBrowserTTS } from "@/lib/speechSynthesis";

type VoiceRow = {
  name: string;
  lang: string;
  default: boolean;
};

function readVoices(): VoiceRow[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().map((v) => ({
    name: v.name,
    lang: v.lang,
    default: v.default,
  }));
}

export function VoiceTestClient() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [voices, setVoices] = useState<VoiceRow[]>([]);
  const [userAgent, setUserAgent] = useState("");

  const refreshVoices = useCallback(() => {
    setAvailable(typeof window !== "undefined" && window.speechSynthesis != null);
    setVoices(readVoices());
    setUserAgent(typeof navigator !== "undefined" ? navigator.userAgent : "");
  }, []);

  useEffect(() => {
    refreshVoices();
    const syn = window.speechSynthesis;
    if (!syn) return;
    const onChanged = () => refreshVoices();
    syn.addEventListener("voiceschanged", onChanged);
    return () => syn.removeEventListener("voiceschanged", onChanged);
  }, [refreshVoices]);

  const testUs = () => {
    speakWithBrowserTTS("Hello", "en-US");
  };

  const testUk = () => {
    speakWithBrowserTTS("Hello", "en-GB");
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 bg-zinc-950 px-4 py-10 text-zinc-100">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Voice test</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Lists{" "}
          <code className="rounded bg-zinc-900 px-1 py-0.5 text-xs">
            speechSynthesis.getVoices()
          </code>{" "}
          and speaks &quot;Hello&quot; with US / UK lang.
        </p>
      </header>

      <dl className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">speechSynthesis</dt>
          <dd className="font-medium text-zinc-100">
            {available === null ? "…" : available ? "可用" : "不可用"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">getVoices().length</dt>
          <dd className="font-medium tabular-nums text-zinc-100">{voices.length}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={testUs}
          disabled={!available}
          className="rounded-full border border-sky-500/40 bg-sky-500/15 px-5 py-2.5 text-sm font-semibold text-sky-100 transition-colors hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation"
        >
          Test US Voice
        </button>
        <button
          type="button"
          onClick={testUk}
          disabled={!available}
          className="rounded-full border border-violet-500/40 bg-violet-500/15 px-5 py-2.5 text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation"
        >
          Test UK Voice
        </button>
        <button
          type="button"
          onClick={refreshVoices}
          className="rounded-full border border-zinc-600 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 touch-manipulation"
        >
          重新整理
        </button>
      </div>

      <section aria-label="All voices">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          All voices ({voices.length})
        </h2>
        {voices.length === 0 ? (
          <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            getVoices() 回傳空陣列。請稍候 voiceschanged，或按「重新整理」。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {voices.map((voice, index) => (
              <li
                key={`${index}|${voice.name}|${voice.lang}|${voice.default}`}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 font-mono text-sm"
              >
                <p>
                  <span className="text-zinc-500">name: </span>
                  {voice.name}
                </p>
                <p className="mt-1">
                  <span className="text-zinc-500">lang: </span>
                  {voice.lang}
                </p>
                <p className="mt-1">
                  <span className="text-zinc-500">default: </span>
                  {String(voice.default)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="break-all font-mono text-[11px] text-zinc-600">{userAgent}</p>
    </div>
  );
}
