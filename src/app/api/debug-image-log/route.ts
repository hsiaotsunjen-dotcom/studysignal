import { NextResponse } from "next/server";

type DebugImageLogBody = {
  step?: unknown;
  payload?: unknown;
  navigatorUserAgent?: unknown;
  timestamp?: unknown;
};

function formatTerminalLine(body: DebugImageLogBody): string {
  const step = typeof body.step === "string" ? body.step : "(no step)";
  const ua =
    typeof body.navigatorUserAgent === "string"
      ? body.navigatorUserAgent
      : "(unknown ua)";
  const ts =
    typeof body.timestamp === "string" ? body.timestamp : new Date().toISOString();
  const payload =
    body.payload !== undefined
      ? JSON.stringify(body.payload, null, 2)
      : "";
  return `[android image debug] ${ts}\n  step: ${step}\n  navigator.userAgent: ${ua}${
    payload ? `\n  payload: ${payload}` : ""
  }`;
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false, error: "僅開發模式可用。" }, { status: 404 });
  }

  let body: DebugImageLogBody;
  try {
    body = (await request.json()) as DebugImageLogBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON。" }, { status: 400 });
  }

  console.log(formatTerminalLine(body));

  return NextResponse.json({ ok: true });
}
