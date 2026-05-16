import type { NextConfig } from "next";

function supabaseImageRemotePatterns(): {
  protocol: "https";
  hostname: string;
  pathname: string;
}[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return [];
  try {
    const host = new URL(raw).hostname;
    return [
      {
        protocol: "https",
        hostname: host,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: supabaseImageRemotePatterns(),
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 3600,
  },
};

export default nextConfig;
