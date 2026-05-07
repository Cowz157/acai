/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["*.vusercontent.net", "*.v0.app", "*.vercel.app"],
}

export default nextConfig
