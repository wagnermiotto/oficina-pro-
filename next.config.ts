import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Uploads de fotos de check-in/OS chegam via Server Action (multipart).
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
