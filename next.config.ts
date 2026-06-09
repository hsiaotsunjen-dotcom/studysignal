import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /** Tree-shake lucide when using `import { … } from "lucide-react"` — avoids broken deep chunk graphs. */
    optimizePackageImports: ["lucide-react"],
    /** Prevents dev-only RSC manifest errors for SegmentViewNode that can precede client chunk failures on `/`. */
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
