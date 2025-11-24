import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        //https://nextjs.org/docs/messages/next-image-unconfigured-host
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Allow org2.easyfastnow.com to embed this app in an iframe
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors https://org2.easyfastnow.com"
          },
          // MUST NOT exist if present:
          // {
          //   key: "X-Frame-Options",
          //   value: "SAMEORIGIN"
          // },
        ],
      },
    ];
  },
};

export default nextConfig;
