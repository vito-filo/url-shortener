import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/:hash",
        destination: "/api/:hash",
      },
    ];
  },
};

export default nextConfig;
