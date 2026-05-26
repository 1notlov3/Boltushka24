import path from "node:path";

/** @type {import('next').NextConfig} */
const envHost = (value) => {
  try {
    return new URL(value || "").hostname || null;
  } catch {
    return null;
  }
};

/**
 * Decode Clerk frontend API host from publishable key (`pk_live_<base64>` or `pk_test_<base64>`).
 * The decoded payload looks like "clerk.<your-domain>$" for production custom-domain instances,
 * or "<slug>.clerk.accounts.dev$" for development. We need this host in CSP `script-src`/`connect-src`
 * because Clerk's clerk.browser.js is served from there when a Production instance with a custom
 * domain is configured (otherwise CSP blocks it and the entire app renders blank).
 */
const clerkFrontendHost = (() => {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  const m = pk.match(/^pk_(?:live|test)_(.+)$/);
  if (!m) return null;
  try {
    const decoded = Buffer.from(m[1], "base64").toString("utf8");
    // Strip trailing "$" sentinel and any non-host chars
    const host = decoded.replace(/\$+$/, "").trim();
    return /^[a-z0-9.-]+$/i.test(host) ? host : null;
  } catch {
    return null;
  }
})();

const supabaseHost = envHost(process.env.NEXT_PUBLIC_SUPABASE_URL);
const livekitHost = envHost(process.env.NEXT_PUBLIC_LIVEKIT_URL);

const hostSources = (host) => host ? [`https://${host}`, `wss://${host}`] : [];

const clerkFrontendSources = clerkFrontendHost
  ? [`https://${clerkFrontendHost}`, `wss://${clerkFrontendHost}`]
  : [];

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
    ...(clerkFrontendHost ? [`https://${clerkFrontendHost}`] : []),
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
    ...clerkFrontendSources,
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
    ...(clerkFrontendHost ? [`https://${clerkFrontendHost}`] : []),
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
      ...(clerkFrontendHost ? [{ protocol: "https", hostname: clerkFrontendHost }] : []),
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
