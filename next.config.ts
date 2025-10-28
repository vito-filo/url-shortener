import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
