import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.myprotein.com",
      },
      {
        protocol: "https",
        hostname: "www.bulk.com",
      },
      {
        protocol: "https",
        hostname: "www.hollandandbarrett.com",
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
      },
    ],
  },
  transpilePackages: ["@wheywise/db"],
};

export default nextConfig;
