import type { NextConfig } from "next";
import os from "os";

/** Dev-only: allow _next HMR when opening the app via LAN IP (e.g. Android tablet). */
function getAllowedDevOriginHosts(): string[] {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        hosts.add(iface.address);
      }
    }
  }
  return [...hosts];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getAllowedDevOriginHosts(),
  experimental: {
    /** Prevents dev-only RSC manifest errors for SegmentViewNode that can precede client chunk failures on `/`. */
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
