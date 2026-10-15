/** @type {import('next').NextConfig} */
const nextConfig = {
  // Card assets already have their published sizes; keep their original URLs.
  // This also disables the unused Image Optimization API on this Next 14 baseline.
  images: { unoptimized: true },
  // Keep the dev server cache isolated from production builds. Running
  // `npm run build` while the dev server is open must not invalidate its CSS.
  distDir: process.env.NODE_ENV === "development" ? process.env.NEXT_DEV_DIST_DIR || ".next-dev" : ".next",
};

export default nextConfig;
