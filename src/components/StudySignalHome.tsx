"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ChangeEvent } from "react";
import {
  AudioWaveform,
  BookOpen,
  Camera,
  ChevronDown,
  GraduationCap,
  Mic,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { AnalyzeFeedbackPanel } from "@/components/AnalyzeFeedbackPanel";
import type { AnalyzeFeedback } from "@/lib/analyzeFeedback";
import { parseAnalyzeApiData } from "@/lib/analyzeFeedback";

type SchoolLevel = "elementary" | "junior" | "senior";

const SCHOOL_LEVELS: { id: SchoolLevel; label: string; abbr: string }[] = [
  { id: "elementary", label: "Elementary School", abbr: "Elementary" },
  { id: "junior", label: "Junior High School", abbr: "Junior High" },
  { id: "senior", label: "Senior High School", abbr: "Senior High" },
];

const SUBJECT_COPY: Record<
  SchoolLevel,
  Record<string, { blurb: string; topics: string[] }>
> = {
  elementary: {
    english: {
      blurb: "Reading, writing, and stories that build confidence.",
      topics: ["Phonics & sight words", "Short reading responses", "Creative prompts"],
    },
    math: {
      blurb: "Number sense through playful practice.",
      topics: ["Addition & subtraction", "Word problems", "Shapes & measurement"],
    },
    science: {
      blurb: "Curiosity-first explorations of the world.",
      topics: ["Plants & animals", "Weather", "Simple experiments"],
    },
    "social-studies": {
      blurb: "Community, maps, and how people live together.",
      topics: ["Neighborhoods", "Maps & directions", "Historical figures"],
    },
  },
  junior: {
    english: {
      blurb: "Stronger essays, analysis, and vocabulary in context.",
      topics: ["Literary devices", "Paragraph structure", "Evidence-based writing"],
    },
    math: {
      blurb: "Ratios, expressions, and early algebra readiness.",
      topics: ["Fractions & decimals", "Proportional reasoning", "Intro to equations"],
    },
    science: {
      blurb: "Models, data, and scientific explanations.",
      topics: ["Cells & systems", "Forces & energy", "Earth processes"],
    },
    "social-studies": {
      blurb: "Civics, geography, and historical thinking.",
      topics: ["Government basics", "Primary sources", "Regional geography"],
    },
  },
  senior: {
    english: {
      blurb: "Rhetoric, synthesis, and exam-ready writing.",
      topics: ["Thesis-driven essays", "Close reading", "Timed writing strategies"],
    },
    math: {
      blurb: "Functions, modeling, and rigorous problem sets.",
      topics: ["Algebra II / precalculus", "Trigonometry", "Data & probability"],
    },
    science: {
      blurb: "Lab reasoning and cross-topic connections.",
      topics: ["Chemistry foundations", "Physics principles", "Biology systems"],
    },
    "social-studies": {
      blurb: "Arguments across time, place, and institutions.",
      topics: ["AP-style FRQs", "Compare & contrast", "Document analysis"],
    },
  },
};

const SUBJECTS = [
  { id: "english", label: "English" },
  { id: "math", label: "Math" },
  { id: "science", label: "Science" },
  { id: "social-studies", label: "Social Studies" },
] as const;

const MAX_IMAGES = 5;

/** Minimum visible lines for the message / transcript textarea. */
const MESSAGE_TEXTAREA_MIN_LINES = 5;

type UploadedImage = {
  id: string;
  url: string;
  name: string;
};

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function newAttachmentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const SPEECH_LANG_OPTIONS = [
  { value: "en-US" as const, label: "American English", short: "US", flag: "🇺🇸" },
  { value: "en-GB" as const, label: "British English", short: "UK", flag: "🇬🇧" },
] as const;

type SpeechRecognitionLang = (typeof SPEECH_LANG_OPTIONS)[number]["value"];

/** Same mime selection as `SpeechTestClient.tsx` for parallel dictation recording. */
function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

/** Client fallback when `fetch` returns !ok but JSON has no string `error`. */
const TRANSCRIBE_FAILURE_FALLBACK_MSG = "語音轉文字失敗，請稍後再試。";

type DictationLineLabel =
  | "START"
  | "STOP"
  | "BLOB_SIZE"
  | "BEFORE_FETCH"
  | "AFTER_FETCH"
  | "RESPONSE_STATUS"
  | "RESPONSE_BODY"
  | "ERROR_BRANCH";

type DictationLineCtx = {
  opId: string | null;
  sessionGen: number;
  intent?: number;
};

function dictationLine(
  label: DictationLineLabel,
  ctx: DictationLineCtx,
  extra?: Record<string, unknown>
) {
  const payload: Record<string, unknown> = {
    opId: ctx.opId,
    sessionGen: ctx.sessionGen,
    ...(ctx.intent !== undefined ? { intent: ctx.intent } : {}),
    ...extra,
  };
  const prefix = `[DICTATION] ${label}`;
  if (label === "ERROR_BRANCH") {
    console.warn(prefix, payload);
  } else {
    console.info(prefix, payload);
  }
}

type DictationUiStatus = "idle" | "recording" | "transcribing" | "ready";

export function StudySignalHome() {
  const fileInputId = useId();
  const previewRegionId = useId();
  const cameraDialogTitleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>("junior");
  const [openSubject, setOpenSubject] = useState<string | null>("english");
  const [message, setMessage] = useState("");
  const messageRef = useRef(message);
  const [attachments, setAttachments] = useState<UploadedImage[]>([]);
  const attachmentsRef = useRef<UploadedImage[]>([]);
  const dictationBaseRef = useRef("");
  const [speechListening, setSpeechListening] = useState(false);
  const [selectedSpeechLang, setSelectedSpeechLang] =
    useState<SpeechRecognitionLang>("en-US");
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [dictationUiStatus, setDictationUiStatus] =
    useState<DictationUiStatus>("idle");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeFeedback | null>(
    null
  );
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  /** Most recent completed parallel mic recording (MediaRecorder), for waveform playback. */
  const [lastVoiceRecording, setLastVoiceRecording] = useState<Blob | null>(null);
  const dictationMediaSessionGenRef = useRef(0);
  const dictationIntentRef = useRef(0);
  const dictationMicStreamRef = useRef<MediaStream | null>(null);
  const dictationMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const dictationRecordedChunksRef = useRef<Blob[]>([]);
  const dictationPlaybackAudioRef = useRef<HTMLAudioElement | null>(null);
  /** opId for this mic session; set at `mr.start()`, cleared on MR ctor/start failure. */
  const dictationTranscribeOpIdRef = useRef<string | null>(null);

  const recordDictationTranscribeError = useCallback(
    (
      message: string,
      branch: string,
      ctx: DictationLineCtx,
      extra?: Record<string, unknown>
    ) => {
      dictationLine("ERROR_BRANCH", ctx, {
        branch,
        userMessage: message,
        producesFallbackTranscribeFailureMessage:
          message === TRANSCRIBE_FAILURE_FALLBACK_MSG,
        ...extra,
      });
      setTranscribeError(message);
    },
    []
  );

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  const syncMessageTextareaHeight = useCallback(() => {
    const el = messageTextareaRef.current;
    if (!el) return;
    const cs = window.getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight);
    const lineHeight = Number.isFinite(lh) && lh > 0 ? lh : 21;
    const padY =
      (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const minHeight = lineHeight * MESSAGE_TEXTAREA_MIN_LINES + padY;
    el.style.height = "auto";
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  }, []);

  useLayoutEffect(() => {
    syncMessageTextareaHeight();
  }, [message, syncMessageTextareaHeight]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.url));
    };
  }, []);

  useEffect(() => {
    if (!cameraModalOpen) return;

    let cancelled = false;
    setCameraError(null);
    setCameraReady(false);
    setCameraStarting(true);

    const stopTracks = () => {
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const v = videoRef.current;
      if (v) v.srcObject = null;
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setCameraError("Camera is not supported in this browser.");
          setCameraStarting(false);
        }
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
      } catch {
        if (!cancelled) {
          setCameraError("Camera access was denied or is unavailable.");
        }
      } finally {
        if (!cancelled) setCameraStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      stopTracks();
      setCameraReady(false);
      setCameraStarting(false);
    };
  }, [cameraModalOpen]);

  useEffect(() => {
    if (!cameraModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCameraModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cameraModalOpen]);

  useEffect(() => {
    return () => {
      dictationMediaSessionGenRef.current += 1;
      const mr = dictationMediaRecorderRef.current;
      dictationMediaRecorderRef.current = null;
      if (mr && mr.state !== "inactive") {
        try {
          mr.stop();
        } catch {
          /* ignore */
        }
      }
      const micStream = dictationMicStreamRef.current;
      dictationMicStreamRef.current = null;
      micStream?.getTracks().forEach((t) => t.stop());
      dictationRecordedChunksRef.current = [];
      dictationPlaybackAudioRef.current?.pause();
      dictationPlaybackAudioRef.current = null;
    };
  }, []);

  const stopDictationMediaHard = useCallback(() => {
    dictationMediaSessionGenRef.current += 1;
    const mr = dictationMediaRecorderRef.current;
    dictationMediaRecorderRef.current = null;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {
        /* ignore */
      }
    }
    const stream = dictationMicStreamRef.current;
    dictationMicStreamRef.current = null;
    stream?.getTracks().forEach((t) => t.stop());
    dictationRecordedChunksRef.current = [];
  }, []);

  const playLastVoiceRecording = useCallback(() => {
    if (!lastVoiceRecording) return;
    dictationPlaybackAudioRef.current?.pause();
    const url = URL.createObjectURL(lastVoiceRecording);
    const audio = new Audio(url);
    dictationPlaybackAudioRef.current = audio;
    audio.addEventListener("ended", () => {
      URL.revokeObjectURL(url);
      if (dictationPlaybackAudioRef.current === audio) {
        dictationPlaybackAudioRef.current = null;
      }
    });
    void audio.play().catch(() => {
      URL.revokeObjectURL(url);
    });
  }, [lastVoiceRecording]);

  const toggleSubject = (id: string) => {
    setOpenSubject((prev) => (prev === id ? null : id));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    setAttachments((prev) => {
      const remaining = MAX_IMAGES - prev.length;
      if (remaining <= 0) return prev;

      const added: UploadedImage[] = [];
      for (const file of Array.from(files)) {
        if (!isImageFile(file)) continue;
        if (added.length >= remaining) break;
        added.push({
          id: newAttachmentId(),
          url: URL.createObjectURL(file),
          name: file.name,
        });
      }
      if (!added.length) return prev;
      return [...prev, ...added];
    });

    event.target.value = "";
  };

  const removeImageById = (id: string) => {
    setAttachments((prev) => {
      const found = prev.find((a) => a.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  const imageCount = attachments.length;
  const hasImages = imageCount > 0;
  const atImageLimit = imageCount >= MAX_IMAGES;

  const openFilePicker = () => {
    if (atImageLimit) return;
    const input = fileInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  };

  const openCameraModal = () => {
    if (atImageLimit) return;
    setCameraModalOpen(true);
  };

  const closeCameraModal = () => {
    setCameraModalOpen(false);
    setCameraError(null);
  };

  const takeCameraPhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth < 2 || video.videoHeight < 2) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const stamp = new Date();
        const name = `Camera ${stamp.toISOString().replace(/[:.]/g, "-")}.jpg`;
        setAttachments((prev) => {
          if (prev.length >= MAX_IMAGES) return prev;
          const next: UploadedImage[] = [
            ...prev,
            {
              id: newAttachmentId(),
              url: URL.createObjectURL(blob),
              name,
            },
          ];
          if (next.length >= MAX_IMAGES) {
            queueMicrotask(() => setCameraModalOpen(false));
          }
          return next;
        });
      },
      "image/jpeg",
      0.92
    );
  };

  const stopDictationRecording = useCallback(() => {
    const mr = dictationMediaRecorderRef.current;
    const sessionGen = dictationMediaSessionGenRef.current;
    const intent = dictationIntentRef.current;
    dictationLine(
      "STOP",
      {
        opId: dictationTranscribeOpIdRef.current,
        sessionGen,
        intent,
      },
      {
        hasRecorder: Boolean(mr),
        recorderState: mr?.state,
      }
    );
    if (mr && mr.state !== "inactive") {
      const wasRecording = mr.state === "recording";
      try {
        mr.stop();
      } catch {
        /* ignore */
      }
      if (wasRecording) {
        setDictationUiStatus("transcribing");
      }
    }
    setSpeechListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    stopDictationMediaHard();
    dictationPlaybackAudioRef.current?.pause();
    dictationPlaybackAudioRef.current = null;
    setLastVoiceRecording(null);
    setTranscribeError(null);
    dictationBaseRef.current = "";
    setMessage("");
    messageRef.current = "";
    setSpeechListening(false);
    setDictationUiStatus("idle");
  }, [stopDictationMediaHard]);

  const runAnalyze = useCallback(async () => {
    setAnalyzeError(null);
    setAnalyzeResult(null);
    setTranscribeError(null);
    const text = messageRef.current.trim();
    if (!text) {
      setAnalyzeError("還沒有可分析的英文，請先輸入或透過麥克風說幾句話。");
      return;
    }
    setAnalyzeLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      const errMsg =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : null;
      if (!res.ok) {
        setAnalyzeError(errMsg ?? `分析失敗（錯誤代碼 ${res.status}）。`);
        return;
      }
      const parsed = parseAnalyzeApiData(data);
      if (!parsed) {
        setAnalyzeError("分析結果不完整，請再試一次。");
        return;
      }
      setAnalyzeResult(parsed);
    } catch (e) {
      setAnalyzeError(
        e instanceof Error ? e.message : "網路連線異常，請稍後再試。"
      );
    } finally {
      setAnalyzeLoading(false);
    }
  }, []);

  const startDictation = useCallback(() => {
    if (dictationMediaRecorderRef.current?.state === "recording") {
      return;
    }

    dictationTranscribeOpIdRef.current = null;
    stopDictationMediaHard();
    setLastVoiceRecording(null);
    setTranscribeError(null);
    setDictationUiStatus("idle");

    let base = messageRef.current;
    if (base.length > 0 && !base.endsWith("\n")) {
      base += "\n";
    }
    dictationBaseRef.current = base;
    setSpeechListening(false);

    const whisperLanguage = selectedSpeechLang.slice(0, 2);

    dictationIntentRef.current += 1;
    const intent = dictationIntentRef.current;

    void (async () => {
      const errorCtx = (): DictationLineCtx => ({
        opId: dictationTranscribeOpIdRef.current,
        sessionGen: dictationMediaSessionGenRef.current,
        intent,
      });

      let stream: MediaStream | null = null;
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
        } catch {
          stream = null;
        }
      }

      if (!stream) {
        if (intent === dictationIntentRef.current) {
          recordDictationTranscribeError(
            "無法使用麥克風，請檢查瀏覽器權限。",
            "BRANCH_MIC_DENIED_OR_UNAVAILABLE",
            errorCtx()
          );
          setDictationUiStatus("idle");
        }
        return;
      }

      if (intent !== dictationIntentRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const sessionGen = dictationMediaSessionGenRef.current;
      dictationMicStreamRef.current = stream;
      dictationRecordedChunksRef.current = [];

      const mime = pickRecorderMimeType();
      let mr: MediaRecorder;
      try {
        mr = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
      } catch {
        stream.getTracks().forEach((t) => t.stop());
        dictationMicStreamRef.current = null;
        dictationRecordedChunksRef.current = [];
        if (intent === dictationIntentRef.current) {
          recordDictationTranscribeError(
            "無法建立錄音器，請改用支援的瀏覽器。",
            "BRANCH_MEDIA_RECORDER_CONSTRUCTOR_THROW",
            { opId: null, sessionGen, intent }
          );
          setDictationUiStatus("idle");
        }
        return;
      }

      if (intent !== dictationIntentRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        dictationMicStreamRef.current = null;
        dictationRecordedChunksRef.current = [];
        return;
      }

      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          dictationRecordedChunksRef.current.push(ev.data);
        }
      };

      mr.onstop = () => {
        if (sessionGen !== dictationMediaSessionGenRef.current) {
          return;
        }
        const chunks = dictationRecordedChunksRef.current.slice();
        dictationRecordedChunksRef.current = [];
        const s = dictationMicStreamRef.current;
        dictationMicStreamRef.current = null;
        s?.getTracks().forEach((t) => t.stop());
        dictationMediaRecorderRef.current = null;
        const blobType =
          mr.mimeType && mr.mimeType !== "" ? mr.mimeType : "audio/webm";

        void (async () => {
          let opId = dictationTranscribeOpIdRef.current;
          if (!opId) {
            opId =
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `dictation-${Date.now()}`;
          }
          const ctx: DictationLineCtx = { opId, sessionGen, intent };
          const maxBodyLog = 12_000;
          try {
            const blob = new Blob(chunks, { type: blobType });
            dictationLine("BLOB_SIZE", ctx, {
              blobBytes: blob.size,
              blobType,
              chunkCount: chunks.length,
            });
            setLastVoiceRecording(blob);

            const ext = blobType.includes("webm")
              ? "webm"
              : blobType.includes("mp4")
                ? "m4a"
                : "webm";
            const form = new FormData();
            form.append("file", blob, `dictation.${ext}`);
            form.append("language", whisperLanguage);

            dictationLine("BEFORE_FETCH", ctx, {
              blobBytes: blob.size,
              ext,
              whisperLanguage,
              endpoint: "/api/transcribe",
            });

            const res = await fetch("/api/transcribe", {
              method: "POST",
              body: form,
            });

            dictationLine("AFTER_FETCH", ctx, {
              ok: res.ok,
              status: res.status,
              statusText: res.statusText,
              responseUrl: res.url,
            });

            const rawText = await res.text();

            dictationLine("RESPONSE_STATUS", ctx, {
              ok: res.ok,
              status: res.status,
              statusText: res.statusText,
              contentType: res.headers.get("content-type"),
            });

            let data: unknown = {};
            let jsonParseFailed = false;
            let parseErrMsg: string | undefined;
            try {
              data = rawText ? (JSON.parse(rawText) as unknown) : {};
            } catch (parseErr) {
              jsonParseFailed = true;
              parseErrMsg =
                parseErr instanceof Error ? parseErr.message : String(parseErr);
              data = {};
            }

            dictationLine("RESPONSE_BODY", ctx, {
              charLength: rawText.length,
              jsonParseFailed,
              parseErr: parseErrMsg,
              body:
                rawText.length > maxBodyLog
                  ? `${rawText.slice(0, maxBodyLog)}…[truncated]`
                  : rawText,
            });

            if (sessionGen !== dictationMediaSessionGenRef.current) {
              return;
            }

            const errMsg =
              typeof data === "object" &&
              data !== null &&
              "error" in data &&
              typeof (data as { error: unknown }).error === "string"
                ? (data as { error: string }).error
                : null;

            if (!res.ok) {
              const resolved = errMsg ?? TRANSCRIBE_FAILURE_FALLBACK_MSG;
              recordDictationTranscribeError(
                resolved,
                resolved === TRANSCRIBE_FAILURE_FALLBACK_MSG
                  ? "BRANCH_POST_FETCH_NOT_OK_MISSING_STRING_ERROR_IN_JSON"
                  : "BRANCH_POST_FETCH_NOT_OK_WITH_SERVER_ERROR_STRING",
                ctx,
                {
                  httpStatus: res.status,
                  errMsgFromJson: errMsg,
                  jsonBodyKeys:
                    typeof data === "object" && data !== null
                      ? Object.keys(data as object)
                      : [],
                  /** This branch + fallback message = exact UI string 語音轉文字失敗，請稍後再試。 */
                  producesFallbackTranscribeFailureMessage:
                    resolved === TRANSCRIBE_FAILURE_FALLBACK_MSG,
                  rootCauseNote:
                    resolved === TRANSCRIBE_FAILURE_FALLBACK_MSG
                      ? "!res.ok and missing string data.error (HTML gateway, empty body, or non-JSON)."
                      : "!res.ok with string data.error from /api/transcribe.",
                }
              );
              setDictationUiStatus("idle");
              return;
            }

            const text =
              typeof data === "object" &&
              data !== null &&
              "text" in data &&
              typeof (data as { text: unknown }).text === "string"
                ? (data as { text: string }).text.trim()
                : "";
            const next =
              text.length > 0
                ? dictationBaseRef.current + text
                : dictationBaseRef.current;
            setMessage(next);
            messageRef.current = next;
            setDictationUiStatus("ready");
          } catch (err) {
            if (sessionGen === dictationMediaSessionGenRef.current) {
              recordDictationTranscribeError(
                "網路連線異常，請稍後再試。",
                "BRANCH_TRANSCRIBE_PIPELINE_THROW",
                ctx,
                {
                  error: err instanceof Error ? err.message : String(err),
                }
              );
              setDictationUiStatus("idle");
            }
          }
        })();
      };

      dictationMediaRecorderRef.current = mr;
      try {
        const opId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `dictation-${Date.now()}`;
        dictationTranscribeOpIdRef.current = opId;
        dictationLine("START", { opId, sessionGen, intent });
        mr.start();
        if (intent === dictationIntentRef.current) {
          setSpeechListening(true);
          setDictationUiStatus("recording");
        }
      } catch (e) {
        const failedOpId = dictationTranscribeOpIdRef.current;
        dictationTranscribeOpIdRef.current = null;
        dictationMediaSessionGenRef.current += 1;
        dictationMediaRecorderRef.current = null;
        stream.getTracks().forEach((t) => t.stop());
        dictationMicStreamRef.current = null;
        dictationRecordedChunksRef.current = [];
        if (intent === dictationIntentRef.current) {
          recordDictationTranscribeError(
            "無法開始錄音。",
            "BRANCH_MR_START_THROW",
            { opId: failedOpId, sessionGen, intent },
            { error: e instanceof Error ? e.message : String(e) }
          );
          setDictationUiStatus("idle");
        }
      }
    })();
  }, [selectedSpeechLang, stopDictationMediaHard, recordDictationTranscribeError]);

  const toggleMicrophoneDictation = useCallback(() => {
    if (dictationMediaRecorderRef.current?.state === "recording") {
      stopDictationRecording();
      return;
    }
    startDictation();
  }, [startDictation, stopDictationRecording]);

  return (
    <div className="relative flex min-h-dvh flex-col bg-surface">
      {/* Ambient gradient — subtle ChatGPT-adjacent depth */}
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        aria-hidden
      >
        <div className="absolute -left-1/4 top-0 h-[420px] w-[420px] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute -right-1/4 top-1/3 h-[380px] w-[380px] rounded-full bg-sky-500/15 blur-[110px]" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        {/* Header */}
        <header className="shrink-0 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-glow ring-1 ring-white/10">
                <Sparkles className="h-5 w-5 text-violet-300" aria-hidden />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-white">
                  StudySignal
                </h1>
                <p className="text-sm text-zinc-400">
                  Focused help for every subject.
                </p>
              </div>
            </div>
            <div className="hidden rounded-full border border-white/10 bg-surface-raised/80 px-3 py-1 text-xs font-medium text-zinc-400 backdrop-blur sm:block">
              Beta
            </div>
          </div>
        </header>

        {/* School level */}
        <section className="shrink-0 pb-5" aria-label="School level">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden />
            School level
          </div>
          <div
            role="radiogroup"
            aria-label="Choose school level"
            className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {SCHOOL_LEVELS.map((lvl) => {
              const selected = schoolLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSchoolLevel(lvl.id)}
                  className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98] touch-manipulation ${
                    selected
                      ? "border-white/15 bg-white text-zinc-950 shadow-lg shadow-black/20"
                      : "border-white/10 bg-surface-raised/60 text-zinc-300 ring-1 ring-white/[0.04] hover:bg-surface-overlay/80 hover:text-white"
                  }`}
                >
                  <span className="sm:hidden">{lvl.abbr}</span>
                  <span className="hidden sm:inline">{lvl.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Subjects */}
        <section
          className={`min-h-0 flex-1 overflow-y-auto scroll-stable ${
            hasImages ? "pb-48 sm:pb-52" : "pb-36"
          }`}
          aria-label="Subjects"
        >
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            Subjects
          </div>
          <div className="flex flex-col gap-2">
            {SUBJECTS.map((subject) => {
              const open = openSubject === subject.id;
              const copy =
                SUBJECT_COPY[schoolLevel][subject.id] ?? {
                  blurb: "",
                  topics: [],
                };
              const panelId = `subject-panel-${subject.id}`;
              const buttonId = `subject-trigger-${subject.id}`;

              return (
                <div
                  key={subject.id}
                  className="overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-raised/40 shadow-glow backdrop-blur-sm transition-colors hover:border-white/[0.12]"
                >
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => toggleSubject(subject.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03] touch-manipulation"
                  >
                    <span className="text-[15px] font-medium text-zinc-100">
                      {subject.label}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    hidden={!open}
                  >
                    <div className="border-t border-white/[0.06] px-4 pb-4 pt-1">
                      <p className="pt-2 text-sm leading-relaxed text-zinc-400">
                        {copy.blurb}
                      </p>
                      <ul className="mt-3 space-y-2">
                        {copy.topics.map((topic) => (
                          <li
                            key={topic}
                            className="flex items-center gap-2 text-sm text-zinc-300"
                          >
                            <span className="h-1 w-1 shrink-0 rounded-full bg-violet-400/80" />
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {cameraModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={cameraDialogTitleId}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default touch-manipulation"
            aria-label="Close camera"
            onClick={closeCameraModal}
          />
          <div className="relative z-10 flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-surface-overlay shadow-2xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
              <h2
                id={cameraDialogTitleId}
                className="text-base font-semibold tracking-tight text-white"
              >
                Camera
              </h2>
              <button
                type="button"
                onClick={closeCameraModal}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white touch-manipulation"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="relative flex min-h-[200px] flex-1 flex-col bg-black">
              {cameraStarting && !cameraError ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60 px-6">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-violet-400" />
                  <p className="text-sm text-zinc-400">Starting camera…</p>
                </div>
              ) : null}
              {cameraError ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                  <p className="text-sm text-zinc-300">{cameraError}</p>
                  <button
                    type="button"
                    onClick={closeCameraModal}
                    className="rounded-full border border-white/15 bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 touch-manipulation"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  className="max-h-[55dvh] min-h-[220px] w-full flex-1 bg-black object-cover sm:max-h-[min(55dvh,420px)]"
                  playsInline
                  muted
                  autoPlay
                  onLoadedData={() => setCameraReady(true)}
                />
              )}
            </div>
            <div className="flex flex-col gap-2 border-t border-white/[0.08] bg-surface-raised/50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="px-1 text-center text-[11px] text-zinc-500 sm:text-left">
                Photos are saved locally with your other images ({imageCount}/{MAX_IMAGES}).
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeCameraModal}
                  className="flex-1 rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/5 touch-manipulation sm:flex-none sm:px-5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={takeCameraPhoto}
                  disabled={
                    atImageLimit ||
                    !cameraReady ||
                    cameraStarting ||
                    Boolean(cameraError)
                  }
                  className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg transition-opacity disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation sm:flex-none sm:px-6"
                >
                  Capture
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Fixed composer */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-surface via-surface/95 to-transparent pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10">
        <div className="pointer-events-auto mx-auto w-full max-w-lg px-2 sm:px-4 md:px-5">
          {hasImages ? (
            <div
              id={previewRegionId}
              role="region"
              aria-label={`Selected images, ${imageCount} of ${MAX_IMAGES}`}
              className="mb-2 rounded-2xl border border-white/10 bg-black/25 p-2.5 shadow-glow ring-1 ring-white/[0.04] backdrop-blur-xl"
            >
              <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Images
                </span>
                <span
                  className="tabular-nums text-xs font-medium text-zinc-400"
                  aria-live="polite"
                >
                  {imageCount}/{MAX_IMAGES}
                </span>
              </div>
              <ul
                className="-mx-0.5 flex list-none snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-0.5 pb-1 pt-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600/80 [&::-webkit-scrollbar-track]:bg-transparent"
                role="list"
              >
                {attachments.map((item) => (
                  <li
                    key={item.id}
                    className="relative h-[4.5rem] w-[4.5rem] shrink-0 snap-start sm:h-24 sm:w-24"
                    role="listitem"
                  >
                    <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950 ring-1 ring-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element -- blob: URLs for local preview */}
                      <img
                        src={item.url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        decoding="async"
                        loading="lazy"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImageById(item.id)}
                      className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-zinc-900/95 text-zinc-200 shadow-md backdrop-blur-md transition-colors hover:bg-zinc-800 hover:text-white active:scale-95 touch-manipulation"
                      aria-label={`Remove ${item.name}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[26px] border border-white/10 bg-surface-overlay/90 shadow-dock backdrop-blur-2xl ring-1 ring-white/[0.04]">
            <div
              className="flex flex-col gap-1.5 border-b border-white/[0.06] px-3 py-2.5 sm:px-4 sm:py-3"
              role="radiogroup"
              aria-label="Dictation language"
            >
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Dictation language
              </span>
              <div className="flex flex-wrap gap-2 sm:gap-2.5">
                {SPEECH_LANG_OPTIONS.map((opt) => {
                  const selected = selectedSpeechLang === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={speechListening}
                      onClick={() => setSelectedSpeechLang(opt.value)}
                      className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-[0.98] touch-manipulation disabled:cursor-not-allowed disabled:opacity-50 ${
                        selected
                          ? "border-white/15 bg-white text-zinc-950 shadow-lg shadow-black/20"
                          : "border-white/10 bg-surface-raised/60 text-zinc-300 ring-1 ring-white/[0.04] hover:bg-surface-overlay/80 hover:text-white"
                      }`}
                    >
                      <span aria-hidden>{opt.flag}</span>{" "}
                      <span className="sm:hidden">{opt.short}</span>
                      <span className="hidden sm:inline">{opt.label}</span>{" "}
                      <span className="tabular-nums text-xs text-zinc-500 sm:text-zinc-600">
                        ({opt.value})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full border-b border-white/[0.06] bg-black/20">
              <textarea
                ref={messageTextareaRef}
                rows={MESSAGE_TEXTAREA_MIN_LINES}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message StudySignal…"
                className="max-h-[min(50vh,28rem)] min-h-0 w-full resize-none overflow-y-auto border-0 bg-black/25 px-3 py-3 text-[15px] leading-snug text-zinc-100 placeholder:text-zinc-500 outline-none transition-[box-shadow,height] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500/25 sm:px-4"
                aria-label="Message input"
              />
            </div>

            <div
              className="flex flex-nowrap items-center justify-start gap-1 overflow-x-auto overscroll-x-contain px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-1.5 sm:px-3 sm:py-2.5 [&::-webkit-scrollbar]:hidden"
              role="toolbar"
              aria-label="Message actions"
            >
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                tabIndex={-1}
                onChange={handleImageChange}
              />
              <button
                type="button"
                onClick={openFilePicker}
                disabled={atImageLimit}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors touch-manipulation sm:h-11 sm:w-11 sm:rounded-2xl ${
                  atImageLimit
                    ? "cursor-not-allowed text-zinc-600"
                    : "cursor-pointer text-zinc-400 hover:bg-white/5 hover:text-white active:scale-95"
                }`}
                title={
                  atImageLimit
                    ? `Maximum ${MAX_IMAGES} images`
                    : "Add images"
                }
                aria-label={
                  atImageLimit
                    ? `Image limit reached (${MAX_IMAGES} of ${MAX_IMAGES})`
                    : "Add images"
                }
              >
                <Upload className="h-5 w-5" aria-hidden />
              </button>

              <button
                type="button"
                onClick={openCameraModal}
                disabled={atImageLimit}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors touch-manipulation sm:h-11 sm:w-11 sm:rounded-2xl ${
                  atImageLimit
                    ? "cursor-not-allowed text-zinc-600"
                    : "cursor-pointer text-zinc-400 hover:bg-white/5 hover:text-white active:scale-95"
                }`}
                title={
                  atImageLimit
                    ? `Maximum ${MAX_IMAGES} images`
                    : "Take photo with camera"
                }
                aria-label={
                  atImageLimit
                    ? `Image limit reached (${MAX_IMAGES} of ${MAX_IMAGES})`
                    : "Open camera"
                }
              >
                <Camera className="h-5 w-5" aria-hidden />
              </button>

              <button
                type="button"
                onClick={clearTranscript}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/5 hover:text-white active:scale-95 touch-manipulation sm:h-11 sm:w-11 sm:rounded-2xl"
                title="Clear text"
                aria-label="Clear text"
              >
                <Trash2 className="h-5 w-5" aria-hidden />
              </button>

              <button
                type="button"
                onClick={toggleMicrophoneDictation}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/5 hover:text-white active:scale-95 touch-manipulation sm:h-11 sm:w-11 sm:rounded-2xl"
                title={speechListening ? "Stop microphone" : "Microphone"}
                aria-label={speechListening ? "Stop microphone" : "Microphone"}
                aria-pressed={speechListening}
              >
                <Mic className="h-5 w-5" aria-hidden />
              </button>

              <button
                type="button"
                onClick={playLastVoiceRecording}
                disabled={!lastVoiceRecording}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors active:scale-95 touch-manipulation sm:h-11 sm:w-11 sm:rounded-2xl ${
                  !lastVoiceRecording
                    ? "cursor-not-allowed text-zinc-600 opacity-40"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
                title="Play last recording"
                aria-label="Play last recording"
              >
                <AudioWaveform className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {dictationUiStatus !== "idle" ? (
              <p
                className="px-3 py-1.5 text-center text-sm text-zinc-400 sm:px-4"
                aria-live="polite"
              >
                {dictationUiStatus === "recording"
                  ? "🔴 Recording..."
                  : dictationUiStatus === "transcribing"
                    ? "⏳ Transcribing..."
                    : "✅ Ready"}
              </p>
            ) : null}
            <div className="space-y-2 border-t border-white/[0.05] px-3 py-2 sm:space-y-2.5 sm:px-4 sm:py-2.5">
            <button
              type="button"
              onClick={() => void runAnalyze()}
              disabled={analyzeLoading}
              className="w-full rounded-2xl border border-violet-500/35 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-500/18 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
            >
              {analyzeLoading ? "分析中…" : "分析英文（發音／語法）"}
            </button>
            {analyzeLoading ? (
              <p className="text-sm text-zinc-400" aria-live="polite">
                分析中…
              </p>
            ) : null}
            {analyzeError ? (
              <p className="text-sm text-amber-400/95" role="alert">
                {analyzeError}
              </p>
            ) : null}
            {transcribeError ? (
              <p className="text-sm text-amber-400/95" role="alert">
                {transcribeError}
              </p>
            ) : null}
            {analyzeResult !== null && !analyzeLoading ? (
              <AnalyzeFeedbackPanel result={analyzeResult} />
            ) : null}
            <p className="pt-0.5 text-center text-[11px] text-zinc-600 sm:pt-1">
              StudySignal can make mistakes. Check important facts.
            </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
