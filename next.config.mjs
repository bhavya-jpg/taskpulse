/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['@whiskeysockets/baileys'],
  experimental: {
    turbopack: {
      root: '.',
    },
  },
}

export default nextConfig
