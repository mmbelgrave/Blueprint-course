import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // scripts/preview-mode.cjs builds into its own folder, so the real build is never overwritten.
  distDir: process.env.NEXT_DIST_DIR_PREVIEW ? ".next-preview" : ".next",
  // Old Step 1 links (before Step 2 existed) keep working.
  async redirects() {
    return [{ source: "/part/:partId/:exerciseId", destination: "/step/1/:partId/:exerciseId", permanent: true }];
  },
};

export default nextConfig;
