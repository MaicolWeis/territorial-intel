/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel não precisa de "standalone" — remove para compatibilidade
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  // Necessário para o Leaflet não quebrar no SSR
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

module.exports = nextConfig;
