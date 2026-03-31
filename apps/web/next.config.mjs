/** @type {import('next').NextConfig} */
const nextConfig = {
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
  transpilePackages: ["@proteindeals/db"],
};

export default nextConfig;
