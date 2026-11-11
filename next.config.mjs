/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  // The pages are Next.js. Everything under /api/ is the Python (Flask) app:
  // on your computer it runs on port 5328 (npm run api); on Vercel it is api/index.py.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          process.env.NODE_ENV === "development" ? "http://127.0.0.1:5328/api/:path*" : "/api/",
      },
    ];
  },
};

export default nextConfig;
