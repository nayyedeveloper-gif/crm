/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enables smaller production deploys (node server.js)
  output: 'standalone',
  async redirects() {
    return [
      // Prefer config redirects over redirect() in pages — avoids App Router React #310
      { source: '/settings', destination: '/settings/profile', permanent: false },
      { source: '/crm', destination: '/login', permanent: false },
    ];
  },
  async rewrites() {
    const api =
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8080/api';
    return [
      {
        source: '/api/:path*',
        destination: `${api}/:path*`,
      },
      // Sales SPA static shell (avoid Next trailing-slash 308 → 404)
      {
        source: '/sales-app',
        destination: '/sales-app/index.html',
      },
    ];
  },
};

export default nextConfig;
