import path from "node:path";

/** @type {import('next').NextConfig} */
const envHost = (value) => {
  try {
    return new URL(value || "").hostname || null;
  } catch {
    return null;
  }
};

const supabaseHost = envHost(process.env.NEXT_PUBLIC_SUPABASE_URL);
const livekitHost = envHost(process.env.NEXT_PUBLIC_LIVEKIT_URL);

const hostSources = (host) => host ? [`https://${host}`, `wss://${host}`] : [];

const csp = [
  "default-src 'self'",
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
    "https://*.accounts.dev",
  ].join(" "),
  [
    "style-src",
    "'self'",
    "'unsafe-inline'",
  ].join(" "),
  [
    "connect-src",
    "'self'",
    "https://*.clerk.com",
    "wss://*.clerk.com",
    "https://*.clerk.accounts.dev",
    "wss://*.clerk.accounts.dev",
    "https://*.accounts.dev",
    "wss://*.accounts.dev",
    ...hostSources(supabaseHost),
    ...hostSources(livekitHost),
  ].join(" "),
  [
    "img-src",
    "'self'",
    "data:",
    "blob:",
    "https://res.cloudinary.com",
    "https://img.clerk.com",
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
    "https://*.accounts.dev",
    "https://media.tenor.com",
    "https:",
    ...(supabaseHost ? [`https://${supabaseHost}`] : []),
  ].join(" "),
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.youtube.com https://youtube.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig = {
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-icons",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-tooltip",
      "@tanstack/react-query",
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },
  images: {
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "media.tenor.com" },
      ...(supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
