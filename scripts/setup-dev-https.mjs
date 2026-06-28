import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const certDir = path.join(rootDir, "certificates");
const keyPath = path.join(certDir, "dev-key.pem");
const certPath = path.join(certDir, "dev-cert.pem");

function getLanIpv4Addresses() {
  const ips = new Set();
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.add(iface.address);
      }
    }
  }
  return [...ips];
}

function hasMkcert() {
  try {
    execSync("mkcert -CAROOT", { stdio: "ignore", shell: true });
    return true;
  } catch {
    return false;
  }
}

if (!hasMkcert()) {
  console.error("mkcert is not installed.");
  console.error("Install: https://github.com/FiloSottile/mkcert#installation");
  console.error("Windows (choco): choco install mkcert");
  console.error("Then run: mkcert -install");
  console.error("");
  console.error("You can still use `npm run dev:https` without mkcert (self-signed cert).");
  process.exit(1);
}

const lanIps = getLanIpv4Addresses();
const hostnames = ["localhost", "127.0.0.1", "::1", ...lanIps];

fs.mkdirSync(certDir, { recursive: true });

console.log("[setup:dev-https] Generating certificate for:", hostnames.join(", "));

execSync(
  `mkcert -key-file "${keyPath}" -cert-file "${certPath}" ${hostnames.join(" ")}`,
  { cwd: rootDir, stdio: "inherit", shell: true },
);

console.log("");
console.log("[setup:dev-https] Done. Certificate files:");
console.log(`  ${keyPath}`);
console.log(`  ${certPath}`);
console.log("");
console.log("[setup:dev-https] Start HTTPS dev server: npm run dev:https");
console.log("[setup:dev-https] Optional — trust on Android tablet:");
console.log("  1. Copy mkcert root CA to the tablet (mkcert -CAROOT shows folder)");
console.log("  2. Install as a user CA in Android Settings → Security → Encryption & credentials");
