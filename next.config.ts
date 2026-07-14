import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets phones on the same Wi-Fi load the dev server via LAN IP (needed to
  // scan the TV screen's QR code and test onboarding from a real device).
  allowedDevOrigins: ["192.168.0.2"],
};

export default nextConfig;
