"use client";

import { useRef } from "react";

type HomeworkImagePickerProps = {
  previewUrl: string | null;
  fileName: string | null;
  disabled?: boolean;
  onImageSelected: (file: File, previewUrl: string) => void;
  onClear: () => void;
};

export function HomeworkImagePicker({
  previewUrl,
  fileName,
  disabled = false,
  onImageSelected,
  onClear,
}: HomeworkImagePickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    onImageSelected(file, URL.createObjectURL(file));
  };

  return (
    <section
      className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-3 sm:p-4"
      aria-label="Homework image upload"
    >
      <div className="flex gap-2 sm:gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-800 px-3 py-3 text-sm font-medium text-zinc-100 ring-1 ring-zinc-700/80 transition active:scale-[0.98] hover:bg-zinc-700/80 disabled:opacity-50"
        >
          <CameraIcon className="h-5 w-5 shrink-0 text-emerald-400" />
          <span>Take photo</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => galleryInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-800 px-3 py-3 text-sm font-medium text-zinc-100 ring-1 ring-zinc-700/80 transition active:scale-[0.98] hover:bg-zinc-700/80 disabled:opacity-50"
        >
          <GalleryIcon className="h-5 w-5 shrink-0 text-sky-400" />
          <span>Gallery</span>
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-hidden
        onChange={(e) => {
          handleFile(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        onChange={(e) => {
          handleFile(e.target.files);
          e.target.value = "";
        }}
      />

      {previewUrl && (
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-zinc-700/80">
          <div className="relative aspect-[4/3] w-full bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Homework preview"
              className="h-full w-full object-contain"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              className="absolute right-2 top-2 rounded-full bg-zinc-900/90 px-2.5 py-1 text-xs font-medium text-zinc-200 ring-1 ring-zinc-600 backdrop-blur-sm hover:bg-zinc-800 disabled:opacity-50"
              aria-label="Remove image"
            >
              Remove
            </button>
          </div>
          {fileName && (
            <p className="truncate px-3 py-2 text-xs text-zinc-500">{fileName}</p>
          )}
        </div>
      )}
    </section>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function GalleryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.5" />
      <path d="m21 16-5.5-5.5a2 2 0 0 0-3 0L7 16" />
    </svg>
  );
}
