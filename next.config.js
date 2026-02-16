/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Exclude native Node modules from Webpack bundling on Vercel
  serverExternalPackages: ["better-sqlite3", "pg", "mysql2"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  },
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
