/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the dev server cache isolated from production builds. Running
  // `npm run build` while the dev server is open must not invalidate its CSS.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
