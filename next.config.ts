import type { NextConfig } from "next";

const frameOrigins = [process.env.DEMO_ORIGIN, process.env.GRAFANA_ORIGIN]
  .filter(Boolean)
  .join(" ");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.0.*.*", "10.200.0.*"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-src 'self' ${frameOrigins}; frame-ancestors 'self'; object-src 'none'; base-uri 'self'`,
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
