import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Uploads de fotos de check-in/OS chegam via Server Action (multipart).
      bodySizeLimit: "15mb",
    },
    // Importa só os módulos usados dessas libs (bundles menores no cliente).
    optimizePackageImports: ["recharts", "date-fns"],
  },
};

export default nextConfig;
