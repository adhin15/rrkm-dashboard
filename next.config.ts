import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan akses dev server dari IP publik VPS (bukan cuma localhost).
  // Penting untuk HMR WebSocket + chunk load saat diakses via 103.93.163.33
  allowedDevOrigins: ["103.93.163.33"],
};

export default nextConfig;
