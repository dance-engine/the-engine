import type { NextConfig } from "next";

const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || '';
const cdnHostname = cdnUrl ? new URL(cdnUrl).hostname : undefined;

const nextConfig: NextConfig = {
  images: {
    // Hosts next/image may load from. Any path, http or https, as images.domains allowed before.
    remotePatterns: [
      ...(cdnHostname ? [{ hostname: cdnHostname }] : []),
      // add other hosts here if needed
    ],
  }
  // experimental: {
  //   serverComponentsHmrCache: false, // defaults to true
  // },
};

export default nextConfig;
