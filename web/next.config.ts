import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output makes a self-contained server bundle (also ideal for
  // containerized deploys). We use it here to run a preview from /tmp.
  output: "standalone",
};

export default nextConfig;
