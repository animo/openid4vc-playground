/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  allowedDevOrigins: ['https://e554-178-227-191-175.ngrok-free.app','e554-178-227-191-175.ngrok-free.app']
}

module.exports = nextConfig
