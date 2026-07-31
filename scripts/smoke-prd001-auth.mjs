/**
 * Full PRD-001 auth API smoke against local HTTPS.
 * Usage:
 *   AUTH_FIXED_VERIFY_CODE=123456 node scripts/smoke-prd001-auth.mjs
 * Server should use the same AUTH_FIXED_VERIFY_CODE (or any code from logs).
 */
import http from "node:http";
import https from "node:https";

const base = process.env.SMOKE_BASE_URL ?? "https://localhost:3000";
const useTls = base.startsWith("https:");
const agent = useTls
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;
const transport = useTls ? https : http;
const fixedCode = process.env.AUTH_FIXED_VERIFY_CODE?.trim() || "123456";
const email = `prd001-dod-${Date.now()}@example.com`;

function request(method, path, body, cookie) {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = transport.request(
      `${base}${path}`,
      {
        method,
        ...(agent ? { agent } : {}),
        headers: {
          Accept: "application/json",
          ...(payload
            ? {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          const text = buf.toString("utf8");
          const ct = String(res.headers["content-type"] || "");
          if (!ct.includes("application/json")) {
            reject(
              new Error(
                `${method} ${path}: expected JSON content-type, got ${ct} body=${text.slice(0, 120)}`,
              ),
            );
            return;
          }
          let json;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            reject(
              new Error(
                `${method} ${path}: malformed JSON: ${text.slice(0, 120)}`,
              ),
            );
            return;
          }
          if ((res.statusCode ?? 0) >= 500) {
            reject(new Error(`5xx ${method} ${path}: ${text}`));
            return;
          }
          const raw = res.headers["set-cookie"];
          const setCookie = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
          resolve({ status: res.statusCode ?? 0, json, setCookie, ct });
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function cookieFrom(setCookie, prev) {
  if (!setCookie) return prev;
  return setCookie.split(";")[0] || prev;
}

async function main() {
  let cookie = "";
  const results = [];

  let r = await request("GET", "/api/auth/session");
  results.push(["GET session", r.status]);
  if (r.status !== 200 || r.json.session !== null) {
    throw new Error("empty session expected null");
  }

  function rawPost(path, payload) {
    return new Promise((resolve, reject) => {
      const req = transport.request(
        `${base}${path}`,
        {
          method: "POST",
          ...(agent ? { agent } : {}),
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf8");
            resolve({
              status: res.statusCode,
              ct: String(res.headers["content-type"] || ""),
              json: JSON.parse(text),
            });
          });
        },
      );
      req.on("error", reject);
      req.write(payload);
      req.end();
    });
  }

  const bad = await rawPost("/api/auth/signup", "not-json");
  if (bad.status !== 400 || bad.json.code !== "INVALID_INPUT") {
    throw new Error(`invalid json expected 400 got ${bad.status}`);
  }
  if (!bad.ct.includes("application/json")) {
    throw new Error("invalid json response not JSON content-type");
  }
  results.push(["POST signup invalid JSON", bad.status]);

  const nullBody = await rawPost("/api/auth/signup", "null");
  if (nullBody.status !== 400) {
    throw new Error(`null body expected 400 got ${nullBody.status}`);
  }
  results.push(["POST signup null body", nullBody.status]);

  r = await request("POST", "/api/auth/signup", {
    parentName: "王媽媽",
    email,
    password: "secret1",
    confirmPassword: "secret1",
  });
  cookie = cookieFrom(r.setCookie, cookie);
  if (r.status !== 200) throw new Error(`signup ${r.status}`);
  if (r.json.session.parent.displayName !== "王媽媽") {
    throw new Error("UTF-8 displayName failed");
  }
  if (r.json.session.onboardingStep !== "verify_email") {
    throw new Error("expected verify_email");
  }
  results.push(["POST signup", r.status]);

  r = await request("POST", "/api/auth/verify-email", { code: "000000" }, cookie);
  if (r.status !== 400 || r.json.code !== "INVALID_CODE") {
    throw new Error("bad code gate failed");
  }
  results.push(["POST verify-email bad", r.status]);

  r = await request("POST", "/api/auth/resend-verification", {}, cookie);
  if (r.status !== 200 || r.json.accepted !== true) {
    throw new Error("resend failed");
  }
  results.push(["POST resend-verification", r.status]);

  r = await request("POST", "/api/auth/profile", { displayName: "王媽媽" }, cookie);
  if (r.status !== 403 || r.json.code !== "EMAIL_NOT_VERIFIED") {
    throw new Error("unverified profile gate failed");
  }
  results.push(["POST profile unverified", r.status]);

  r = await request(
    "POST",
    "/api/auth/verify-email",
    { code: fixedCode },
    cookie,
  );
  if (r.status !== 200) {
    throw new Error(
      `verify with AUTH_FIXED_VERIFY_CODE=${fixedCode} failed: ${r.status} ${JSON.stringify(r.json)}. Restart server with AUTH_FIXED_VERIFY_CODE=${fixedCode}`,
    );
  }
  results.push(["POST verify-email", r.status]);

  r = await request("POST", "/api/auth/profile", { displayName: "王媽媽" }, cookie);
  if (r.status !== 200) throw new Error(`profile ${r.status}`);
  results.push(["POST profile", r.status]);

  r = await request("POST", "/api/auth/family", {}, cookie);
  if (r.status !== 200) throw new Error(`family ${r.status}`);
  if (r.json.session.family.name !== "王媽媽 的家庭") {
    throw new Error("family UTF-8 failed");
  }
  results.push(["POST family", r.status]);

  r = await request(
    "POST",
    "/api/auth/invite-student",
    { studentName: "小明", grade: "小三" },
    cookie,
  );
  if (r.status !== 200) throw new Error(`invite ${r.status}`);
  if (r.json.session.onboardingStep !== "complete") {
    throw new Error("expected complete");
  }
  results.push(["POST invite-student", r.status]);

  r = await request("GET", "/api/auth/session", undefined, cookie);
  if (r.status !== 200 || !r.json.session) throw new Error("session missing");
  results.push(["GET session authed", r.status]);

  r = await request("POST", "/api/auth/login", {
    email,
    password: "secret1",
  });
  if (r.status !== 200) throw new Error(`login ${r.status}`);
  results.push(["POST login", r.status]);

  for (const [name, status] of results) {
    console.log(`OK ${status} ${name}`);
  }
  console.log("SMOKE_PASS");
}

main().catch((err) => {
  console.error("SMOKE_FAIL", err.message || err);
  process.exit(1);
});
