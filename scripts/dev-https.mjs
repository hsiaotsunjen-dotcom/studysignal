import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const certDir = path.join(rootDir, "certificates");
const keyPath = path.join(certDir, "dev-key.pem");
const certPath = path.join(certDir, "dev-cert.pem");
const nextBin = path.join(rootDir, "node_modules", "next", "dist", "bin", "next");

function getLanIpv4Addresses() {
  const ips = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

if (!fs.existsSync(nextBin)) {
  console.error("[dev:https] Next.js binary not found. Run `npm install` first.");
  process.exit(1);
}

const nextArgs = ["dev", "-p", "3000", "--experimental-https"];

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  nextArgs.push("--experimental-https-key", keyPath, "--experimental-https-cert", certPath);
  console.log("[dev:https] Using certificates/dev-*.pem (mkcert, includes LAN IP)");
} else {
  console.log("[dev:https] Using Next.js built-in self-signed certificate");
  console.log("[dev:https] Tip: run `npm run setup:dev-https` once for trusted LAN certs");
}

console.log("[dev:https] Local:   https://localhost:3000");
const lanIps = getLanIpv4Addresses();
if (lanIps.length > 0) {
  for (const ip of lanIps) {
    console.log(`[dev:https] Network: https://${ip}:3000`);
  }
} else {
  console.log("[dev:https] Network: https://<your-LAN-IP>:3000");
}

const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  cwd: rootDir,
  stdio: "inherit",
  env: process.env,
});

child.on("error", (err) => {
  console.error("[dev:https] Failed to start Next.js:", err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
