import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['ws'],
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'bufferutil', 'utf-8-validate']
    return config
  },
}

export default nextConfig
