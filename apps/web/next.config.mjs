/** @type {import('next').NextConfig} */
const baseUrl =
  process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim() !== ''
    ? process.env.NEXTAUTH_URL
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NODE_ENV === 'production'
    ? 'https://watchparty-amber-psi.vercel.app'
    : 'http://localhost:3000';

// Generate a unique deployment identifier for every build to guarantee fresh room isolation
const buildTimestamp = Date.now().toString(36);
const gitSha = process.env.VERCEL_GIT_COMMIT_SHA
  ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  : 'local';
const deployId = `wp-${gitSha}-${buildTimestamp}`;

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@watch-party/shared'],
  env: {
    NEXTAUTH_URL: baseUrl,
    NEXT_PUBLIC_BASE_URL: baseUrl,
    NEXT_PUBLIC_DEPLOY_ID: deployId,
  },
};

export default nextConfig;

