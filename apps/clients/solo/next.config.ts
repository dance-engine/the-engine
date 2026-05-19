import type { NextConfig } from "next";
import { parse } from 'url';

const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || '';
const cdnHostname = cdnUrl ? parse(cdnUrl).hostname : undefined;

const nextConfig: NextConfig = {
  images: {
    domains: [
      ...(cdnHostname ? [cdnHostname] : []),
      // add other domains here if needed
    ],
  },
  // experimental: {
  //   serverComponentsHmrCache: false, // defaults to true
  // },
};

export default nextConfig;
