import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Força HTTPS por 1 ano (o site só é servido via TLS na Hostinger).
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Nenhuma página do sistema precisa rodar dentro de iframe de terceiros.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
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
