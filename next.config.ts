import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Logótipo, capa e portefólio são enviados por server actions (as fotos à venda usam /api/admin/photos).
    serverActions: { bodySizeLimit: "30mb" },
  },
};

export default nextConfig;
