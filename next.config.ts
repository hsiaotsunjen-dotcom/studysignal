import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /** Prevents dev-only RSC manifest errors for SegmentViewNode that can precede client chunk failures on `/`. */
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
