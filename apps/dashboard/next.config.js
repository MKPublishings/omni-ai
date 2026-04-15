/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  // Disable Image Optimization for static export
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig