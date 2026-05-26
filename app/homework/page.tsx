"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HomeworkImagePicker } from "@/components/homework/HomeworkImagePicker";
import { HomeworkInputBar } from "@/components/homework/HomeworkInputBar";
import { HomeworkResponseArea } from "@/components/homework/HomeworkResponseArea";
import {
  INITIAL_HOMEWORK_MESSAGE,
  createHomeworkMessage,
  type HomeworkMessage,
} from "@/lib/homework";
import { fetchHomeworkTutor, toHomeworkHistory } from "@/lib/homework-api";

export default function HomeworkPage() {
  const [messages, setMessages] = useState<HomeworkMessage[]>([
    INITIAL_HOMEWORK_MESSAGE,
  ]);
  const messagesRef = useRef<HomeworkMessage[]>(messages);
  messagesRef.current = messages;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const imageFileRef = useRef<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const revokePreview = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const handleImageSelected = useCallback(
    (file: File, url: string) => {
      revokePreview(previewUrlRef.current);
      previewUrlRef.current = url;
      imageFileRef.current = file;
      setPreviewUrl(url);
      setFileName(file.name);
    },
    [revokePreview]
  );

  const handleClearImage = useCallback(() => {
    revokePreview(previewUrlRef.current);
    previewUrlRef.current = null;
    imageFileRef.current = null;
    setPreviewUrl(null);
    setFileName(null);
  }, [revokePreview]);

  useEffect(() => {
    return () => revokePreview(previewUrlRef.current);
  }, [revokePreview]);

  const requestTutor = useCallback(
    async (
      userContent: string,
      options?: { imageFile?: File | null; userImageUrl?: string }
    ) => {
      if (isLoadingRef.current) return;

      const history = toHomeworkHistory(messagesRef.current);
      const userMessage = createHomeworkMessage(
        "user",
        userContent,
        options?.userImageUrl
      );

      setMessages((prev) => {
        const next = [...prev, userMessage];
        messagesRef.current = next;
        return next;
      });

      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const { message } = await fetchHomeworkTutor({
          message: userContent,
          image: options?.imageFile ?? null,
          history,
        });

        setMessages((prev) => {
          const next = [...prev, createHomeworkMessage("assistant", message)];
          messagesRef.current = next;
          return next;
        });
      } catch (err) {
        const errMessage =
          err instanceof Error ? err.message : "Failed to reach the tutor.";
        setError(errMessage);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    []
  );

  const handleSubmit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const imageFile = imageFileRef.current;
      const hasImage = Boolean(imageFile && previewUrl);

      if (!trimmed && !hasImage) return;

      const content =
        trimmed ||
        "I uploaded my homework. Can you help me understand this?";

      void requestTutor(content, {
        imageFile: hasImage ? imageFile : null,
        userImageUrl: previewUrl ?? undefined,
      });
      handleClearImage();
    },
    [previewUrl, requestTutor, handleClearImage]
  );

  const handleAnalyzePhoto = useCallback(() => {
    const imageFile = imageFileRef.current;
    if (!imageFile || !previewUrl) return;

    void requestTutor(
      "Please look at my homework photo and help me get started.",
      { imageFile, userImageUrl: previewUrl }
    );
    handleClearImage();
  }, [previewUrl, requestTutor, handleClearImage]);

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="shrink-0 border-b border-zinc-800/80 px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100 sm:text-xl">
              Homework Study Assistant
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Snap or upload homework · get guided help
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-zinc-500 ring-1 ring-zinc-800 hover:text-zinc-300"
          >
            Chat tutor
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 sm:px-6">
          <HomeworkImagePicker
            previewUrl={previewUrl}
            fileName={fileName}
            disabled={isLoading}
            onImageSelected={handleImageSelected}
            onClear={handleClearImage}
          />

          {previewUrl && (
            <button
              type="button"
              disabled={isLoading}
              onClick={handleAnalyzePhoto}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? "Analyzing…" : "Analyze homework photo"}
            </button>
          )}

          {error && (
            <p
              className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <HomeworkResponseArea messages={messages} isLoading={isLoading} />
      </div>

      <HomeworkInputBar
        disabled={isLoading}
        placeholder={
          isLoading
            ? "Tutor is reviewing your homework…"
            : previewUrl
              ? "Add a question about this photo…"
              : "Ask about your homework…"
        }
        onSubmit={handleSubmit}
      />

      <div
        className="h-[calc(5.5rem+env(safe-area-inset-bottom))] shrink-0"
        aria-hidden
      />
    </main>
  );
}
