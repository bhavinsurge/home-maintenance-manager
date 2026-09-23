import type { NextConfig } from "next";

const apiOrigin = process.env.API_URL ?? "http://127.0.0.1:4005";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
