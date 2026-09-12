/** @type {import('next').NextConfig} */
const baseUrl =
  process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim() !== ''
    ? process.env.NEXTAUTH_URL
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@watch-party/shared'],
  env: {
    NEXTAUTH_URL: baseUrl,
    NEXT_PUBLIC_BASE_URL: baseUrl,
  },
};

export default nextConfig;
