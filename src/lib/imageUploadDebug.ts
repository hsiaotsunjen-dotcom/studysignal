/** TEMPORARY: image upload / blob read debugging (Android Chrome). */
export const IMAGE_UPLOAD_DEBUG = true;

/** TEMPORARY: Android-only verbose attachment / Blob probes. */
export const ANDROID_IMAGE_DEBUG = true;

const DEBUG_IMAGE_LOG_API = "/api/debug-image-log";

export type ImageUploadDebugPayload = {
  text: string;
  includePronunciation: boolean;
  images?: { mimeType: string; dataBase64: string }[];
};

/** Minimal attachment shape for Android debug snapshots. */
export type AndroidAttachmentDebugItem = {
  id: string;
  url: string;
  name: string;
  sourceBlob?: Blob | null;
};

export function isAndroidClient(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function safeSerializeForDebug(value: unknown): unknown {
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, v: unknown) => {
        if (v instanceof Error) {
          return {
            message: v.message,
            name: v.name,
            stack: v.stack,
          };
        }
        return v;
      }),
    );
  } catch {
    return String(value);
  }
}

function postAndroidDebugToTerminal(step: string, payload?: unknown) {
  if (typeof fetch === "undefined") return;

  const navigatorUserAgent =
    typeof navigator !== "undefined" ? navigator.userAgent : null;

  void fetch(DEBUG_IMAGE_LOG_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      step,
      payload:
        payload !== undefined ? safeSerializeForDebug(payload) : undefined,
      navigatorUserAgent,
      timestamp: new Date().toISOString(),
    }),
    keepalive: true,
  }).catch((err: unknown) => {
    console.warn("[android image debug] terminal relay failed", err);
  });
}

function androidImageDebugLog(step: string, payload?: unknown) {
  if (!ANDROID_IMAGE_DEBUG || !isAndroidClient()) return;
  if (payload !== undefined) {
    console.log(`[android image debug] ${step}`, payload);
  } else {
    console.log(`[android image debug] ${step}`);
  }
  postAndroidDebugToTerminal(step, payload);
}

export function logAndroidUserAgent(context: string) {
  androidImageDebugLog(context, {
    navigatorUserAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
}

export function logAndroidAttachmentsSnapshot(
  step: string,
  attachments: AndroidAttachmentDebugItem[],
) {
  if (!ANDROID_IMAGE_DEBUG || !isAndroidClient()) return;

  logAndroidUserAgent(step);

  androidImageDebugLog(`${step} — attachments full`, {
    count: attachments.length,
    items: attachments.map((att, index) => formatAttachmentDebugRow(att, index)),
  });
}

function formatAttachmentDebugRow(
  att: AndroidAttachmentDebugItem,
  index: number,
) {
  const previewUrl = att.url;
  const type = att.sourceBlob?.type ?? null;
  const size = att.sourceBlob?.size ?? null;
  return {
    index,
    id: att.id,
    name: att.name,
    type,
    size,
    previewUrl,
    previewUrlEmpty: !previewUrl || previewUrl.length === 0,
    previewUrlIsBlobScheme: previewUrl.startsWith("blob:"),
    previewUrlIsDataImage: previewUrl.startsWith("data:image"),
    urlIsDataImage: previewUrl.startsWith("data:image"),
    url: previewUrl,
    sourceBlobExists: att.sourceBlob != null,
    "sourceBlob instanceof Blob": att.sourceBlob instanceof Blob,
    "sourceBlob instanceof File":
      att.sourceBlob != null &&
      typeof File !== "undefined" &&
      att.sourceBlob instanceof File,
    "sourceBlob.type": att.sourceBlob?.type ?? null,
    "sourceBlob.size": att.sourceBlob?.size ?? null,
  };
}

/** Classify what the file picker returned (never a raw content:// URI in JS). */
export function logAndroidGalleryPickInput(
  step: string,
  file: File,
  inputValue: string | null,
) {
  if (!ANDROID_IMAGE_DEBUG || !isAndroidClient()) return;

  const isFile = typeof File !== "undefined" && file instanceof File;
  const isBlob = file instanceof Blob;
  const looksLikeContentUriName =
    /content:/i.test(file.name) || /content:/i.test(inputValue ?? "");

  androidImageDebugLog(`${step} — picker input type`, {
    "input.value": inputValue,
    "note":
      "Web file input never exposes content:// to JS; browser wraps MediaStore as File/Blob.",
    pickKind: isFile ? "File" : isBlob ? "Blob" : "unknown",
    "file instanceof File": isFile,
    "file instanceof Blob": isBlob,
    isContentUriStringInName: looksLikeContentUriName,
    "file.name": file.name,
    "file.type": file.type,
    "file.size": file.size,
    "file.lastModified": file.lastModified,
  });
}

export function logAndroidIsImageFileCheck(
  file: File,
  isImage: boolean,
  checkLocation: string,
) {
  if (!ANDROID_IMAGE_DEBUG || !isAndroidClient()) return;

  androidImageDebugLog("isImageFile() result", {
    checkLocation,
    isImage,
    "file.type": file.type,
    "file.type.startsWith('image/')": file.type.startsWith("image/"),
    rejectedByLine: isImage
      ? null
      : "StudySignalHome.tsx handleImageChange — if (!isImageFile(file)) continue;",
  });
}

export function logAndroidCreateObjectURLAttempt(
  label: string,
  blob: Blob,
  result: { ok: true; url: string } | { ok: false; error: unknown },
) {
  if (!ANDROID_IMAGE_DEBUG || !isAndroidClient()) return;

  if (result.ok) {
    androidImageDebugLog(`URL.createObjectURL() success — ${label}`, {
      createObjectURLLocation:
        "StudySignalHome.tsx handleImageChange — url: URL.createObjectURL(file)",
      previewUrl: result.url,
      previewUrlEmpty: result.url.length === 0,
      previewUrlIsBlobScheme: result.url.startsWith("blob:"),
      "sourceBlob.type": blob.type,
      "sourceBlob.size": blob.size,
    });
  } else {
    androidImageDebugLog(`URL.createObjectURL() failed — ${label}`, {
      createObjectURLLocation:
        "StudySignalHome.tsx handleImageChange — url: URL.createObjectURL(file)",
      exception: result.error,
      message:
        result.error instanceof Error
          ? result.error.message
          : String(result.error),
      stack: result.error instanceof Error ? result.error.stack : null,
      "sourceBlob.type": blob.type,
      "sourceBlob.size": blob.size,
    });
  }
}

export function logAndroidAttachmentBuilt(
  step: string,
  attachment: AndroidAttachmentDebugItem,
) {
  if (!ANDROID_IMAGE_DEBUG || !isAndroidClient()) return;

  androidImageDebugLog(`${step} — attachment built`, {
    buildLocation:
      "StudySignalHome.tsx handleImageChange — added.push({ id, url, name, sourceBlob })",
    ...formatAttachmentDebugRow(attachment, 0),
    sourceBlobEstablished: attachment.sourceBlob != null,
  });
}

export function logAndroidGalleryFileSkipped(
  reason: string,
  file: File,
  codeLocation: string,
) {
  if (!ANDROID_IMAGE_DEBUG || !isAndroidClient()) return;

  androidImageDebugLog(`gallery file skipped — ${reason}`, {
    codeLocation,
    "file.name": file.name,
    "file.type": file.type,
    "file.size": file.size,
  });
}

/** Probe whether a blob URL can decode as an image (same mechanism as composer thumbnail). */
export function probeAndroidThumbnailUrl(
  previewUrl: string,
  attachmentId: string,
  attachmentName: string,
) {
  if (!ANDROID_IMAGE_DEBUG || !isAndroidClient()) return;
  if (typeof Image === "undefined") return;

  androidImageDebugLog("thumbnail probe start", {
    imgRenderLocation:
      "StudySignalHome.tsx composer — <img src={item.url} alt={item.name} />",
    attachmentId,
    attachmentName,
    previewUrl,
    previewUrlEmpty: !previewUrl || previewUrl.length === 0,
  });

  const probe = new Image();
  probe.onload = () => {
    androidImageDebugLog("thumbnail probe — Image.onload (thumbnail should render)", {
      attachmentId,
      attachmentName,
      previewUrl,
      naturalWidth: probe.naturalWidth,
      naturalHeight: probe.naturalHeight,
    });
  };
  probe.onerror = () => {
    androidImageDebugLog("thumbnail probe — Image.onerror (thumbnail will NOT render)", {
      attachmentId,
      attachmentName,
      previewUrl,
      likelyCause:
        "blob URL failed to decode in <img>; check sourceBlob.size, file.type MIME, or unsupported format (e.g. HEIC).",
      eventType: "error",
    });
  };
  probe.src = previewUrl;
}

export function logAndroidComposerImgEvent(
  event: "load" | "error",
  item: { id: string; name: string; url: string },
  detail?: { naturalWidth?: number; naturalHeight?: number },
) {
  if (!ANDROID_IMAGE_DEBUG || !isAndroidClient()) return;

  const base = {
    imgRenderLocation:
      "StudySignalHome.tsx composer — <img src={item.url} alt={item.name} />",
    attachmentId: item.id,
    name: item.name,
    previewUrl: item.url,
    previewUrlEmpty: !item.url || item.url.length === 0,
  };

  if (event === "load") {
    androidImageDebugLog("composer <img> onLoad — thumbnail rendered", {
      ...base,
      naturalWidth: detail?.naturalWidth ?? null,
      naturalHeight: detail?.naturalHeight ?? null,
    });
  } else {
    androidImageDebugLog("composer <img> onerror — thumbnail failed (alt text may show filename)", {
      ...base,
      whyNoThumbnail:
        "Browser could not decode previewUrl; user may only see img alt (file.name).",
    });
  }
}

export function logAndroidBlobBeforeArrayBuffer(
  label: string,
  blob: Blob,
  fileName?: string,
) {
  androidImageDebugLog(`Blob.arrayBuffer() before — ${label}`, {
    "file.name": fileName ?? null,
    "sourceBlob instanceof Blob": blob instanceof Blob,
    "sourceBlob.type": blob.type,
    "sourceBlob.size": blob.size,
  });
}

export function logAndroidBlobArrayBufferSuccess(
  label: string,
  byteLength: number,
) {
  androidImageDebugLog(`Blob.arrayBuffer() success — ${label}`, {
    byteLength,
  });
}

export function logAndroidBlobArrayBufferFailure(label: string, error: unknown) {
  androidImageDebugLog(`Blob.arrayBuffer() failed — ${label}`, {
    exception: error,
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : null,
    stack: error instanceof Error ? error.stack : null,
  });
}

export function logSendTutorMessageTrace(
  step: string,
  detail?: Record<string, unknown>,
) {
  const payload = {
    file: "src/components/StudySignalHome.tsx",
    step,
    ...detail,
  };
  console.error(`[sendTutorMessage trace] ${step}`, payload);
  if (ANDROID_IMAGE_DEBUG && isAndroidClient()) {
    androidImageDebugLog(`sendTutorMessage trace: ${step}`, payload);
  }
}

export function logSendTutorMessageCaughtError(
  codeLocation: string,
  error: unknown,
) {
  const payload = {
    file: "src/components/StudySignalHome.tsx",
    codeLocation,
    "error.name":
      error instanceof DOMException
        ? error.name
        : error instanceof Error
          ? error.name
          : null,
    "error.message": error instanceof Error ? error.message : String(error),
    "error.stack": error instanceof Error ? error.stack : null,
  };
  console.error("[sendTutorMessage caught error]", payload);
  if (ANDROID_IMAGE_DEBUG && isAndroidClient()) {
    androidImageDebugLog("sendTutorMessage caught error", payload);
  }
}

function encodeImagesDebugLog(step: string, payload?: unknown) {
  imageUploadDebugLog(`encode images: ${step}`, payload);
  if (ANDROID_IMAGE_DEBUG && isAndroidClient()) {
    androidImageDebugLog(`encode images: ${step}`, payload);
  }
}

export function logEncodeFlowStart(
  caller: string,
  attachments: AndroidAttachmentDebugItem[],
) {
  encodeImagesDebugLog(`${caller} — start`, {
    attachmentsCount: attachments.length,
    items: attachments.map((att, index) => ({
      ...formatAttachmentDebugRow(att, index),
    })),
  });
}

export function logEncodeAttachmentBranch(
  caller: string,
  att: AndroidAttachmentDebugItem,
  branch:
    | "blobToImagePayload"
    | "blobUrlToImagePayload"
    | "parseDataUrlPayload"
    | "blobToTutorChatImagePayload"
    | "blobUrlToTutorChatImagePayload"
    | "tutorChatImagePayloadFromUrl",
  ifCondition: string,
) {
  encodeImagesDebugLog(`${caller} — branch`, {
    attachmentName: att.name,
    attachmentId: att.id,
    urlIsDataImage: att.url.startsWith("data:image"),
    urlPrefix: att.url.slice(0, 32),
    sourceBlobExists: att.sourceBlob != null,
    "sourceBlob.size": att.sourceBlob?.size ?? null,
    "sourceBlob.type": att.sourceBlob?.type ?? null,
    branch,
    ifCondition,
  });
}

export function logEncodeAttachmentResult(
  caller: string,
  attachmentName: string,
  encoded: boolean,
  detail?: Record<string, unknown>,
) {
  encodeImagesDebugLog(`${caller} — attachment result`, {
    attachmentName,
    encoded,
    returnedNull: !encoded,
    ...detail,
  });
}

export function logEncodeFlowEnd(
  caller: string,
  attachmentsCount: number,
  imagesLength: number,
) {
  encodeImagesDebugLog(`${caller} — end`, {
    attachmentsCount,
    imagesLength,
    encodedAllAttachments: imagesLength === attachmentsCount && attachmentsCount > 0,
  });
}

export function logEncodeErrorReturn(
  caller: string,
  codeLocation: string,
  context: Record<string, unknown>,
) {
  encodeImagesDebugLog(`${caller} — returns error to user`, {
    userMessage: "無法讀取已附加的圖片，請移除後重新上傳再試。",
    codeLocation,
    ...context,
  });
}

export function logEncodeBlobArrayBufferBefore(
  caller: string,
  blob: Blob,
  fileName?: string,
) {
  encodeImagesDebugLog(`${caller} — Blob.arrayBuffer() before`, {
    "sourceBlob.exists": blob != null,
    "sourceBlob.size": blob.size,
    "sourceBlob.type": blob.type,
    "file.name": fileName ?? null,
  });
  logAndroidBlobBeforeArrayBuffer(caller, blob, fileName);
}

export function logEncodeBlobArrayBufferSuccess(
  caller: string,
  byteLength: number,
) {
  encodeImagesDebugLog(`${caller} — Blob.arrayBuffer() success`, { byteLength });
  logAndroidBlobArrayBufferSuccess(caller, byteLength);
}

export function logEncodeBlobArrayBufferFailure(
  caller: string,
  error: unknown,
) {
  encodeImagesDebugLog(`${caller} — Blob.arrayBuffer() failed`, {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : null,
    stack: error instanceof Error ? error.stack : null,
  });
  logAndroidBlobArrayBufferFailure(caller, error);
}

export function imageUploadDebugLog(step: string, payload?: unknown) {
  if (!IMAGE_UPLOAD_DEBUG) return;
  if (payload !== undefined) {
    console.log(`[image upload debug] ${step}`, payload);
  } else {
    console.log(`[image upload debug] ${step}`);
  }
}

export function logImageFileDebug(label: string, file: File) {
  imageUploadDebugLog(label, {
    "file.name": file.name,
    "file.type": file.type,
    "file.size": file.size,
    "file instanceof File": file instanceof File,
    "image MIME type": file.type,
  });
  if (isAndroidClient()) {
    logAndroidUserAgent(`gallery — ${label}`);
    androidImageDebugLog(`gallery file — ${label}`, {
      "file.name": file.name,
      "file.type": file.type,
      "file.size": file.size,
      "file instanceof File": file instanceof File,
      "sourceBlob instanceof Blob": file instanceof Blob,
      "sourceBlob.type": file.type,
      "sourceBlob.size": file.size,
    });
  }
}

export function logPreAnalyzeApiPayload(payload: ImageUploadDebugPayload) {
  const formData = new FormData();
  formData.append("text", payload.text);
  formData.append(
    "includePronunciation",
    String(payload.includePronunciation),
  );
  payload.images?.forEach((im, i) => {
    formData.append(`images[${i}].mimeType`, im.mimeType);
    formData.append(
      `images[${i}].dataBase64Length`,
      String(im.dataBase64.length),
    );
  });
  const formDataKeys =
    typeof formData.keys === "function"
      ? Array.from(formData.keys())
      : [];
  imageUploadDebugLog("before /api/analyze", {
    transport: "application/json (images are base64 in JSON, not multipart)",
    "FormData keys (debug mirror only, not sent)": formDataKeys,
    "JSON body keys": [
      "text",
      "includePronunciation",
      ...(payload.images?.length ? ["images"] : []),
    ],
    imageCount: payload.images?.length ?? 0,
    images: payload.images?.map((im, i) => ({
      index: i,
      "image MIME type": im.mimeType,
      dataBase64Length: im.dataBase64.length,
    })),
  });
}
