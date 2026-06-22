import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@careflow/ui", "@careflow/shared", "@careflow/database"],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default nextConfig;
