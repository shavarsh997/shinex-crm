import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["sugarlab-shavarsh.ngrok.app"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
