/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // UNCOMMENT untuk static export testing:
  // output: 'export',
  // distDir: 'dist',
  // images: {
  //   unoptimized: true
  // },
  
  // Skip error saat build (untuk testing)
  // typescript: {
  //   ignoreBuildErrors: true
  // },
  // eslint: {
  //   ignoreDuringBuilds: true
  // },
  
  // Konfigurasi images (jika pakai next/image)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  
  // Headers untuk CORS (jika perlu)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ]
  },
};

module.exports = nextConfig;
