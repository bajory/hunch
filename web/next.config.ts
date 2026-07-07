import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output makes a self-contained server bundle (also ideal for
  // containerized deploys). We use it here to run a preview from /tmp.
  output: "standalone",
  // Let other devices on the LAN load dev assets (phone/tablet testing)
  allowedDevOrigins: ["192.168.18.65"],
  // Admin image uploads (jersey photos ~1.3MB, competition patches up to ~6MB)
  // run through Server Actions, whose body cap defaults to 1MB — raise it.
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  async redirects() {
    return [
      { source: "/jersey/:slug", destination: "/product/:slug", permanent: true },
      { source: "/jerseys/:team", destination: "/product/:team-home", permanent: true },
      { source: "/collections", destination: "/shop", permanent: true },
      { source: "/atelier", destination: "/house", permanent: true },
      { source: "/the-house", destination: "/house", permanent: true },
    ];
  },
};

export default nextConfig;
