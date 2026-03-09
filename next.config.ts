import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['ws'],
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'bufferutil', 'utf-8-validate']
    return config
  },
}

export default nextConfig
