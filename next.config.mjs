/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      domains: [
        "res.cloudinary.com"
      ]
    },
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            {
              // Prevents MIME type sniffing
              key: "X-Content-Type-Options",
              value: "nosniff"
            },
            {
              // Prevents Clickjacking
              key: "X-Frame-Options",
              value: "SAMEORIGIN"
            },
            {
              // Protects referrer data
              key: "Referrer-Policy",
              value: "strict-origin-when-cross-origin"
            },
            {
              // Disables features like geolocation for privacy
              key: "Permissions-Policy",
              value: "geolocation=(), browsing-topics=()"
            },
            {
              // Disables DNS prefetching for privacy
              key: "X-DNS-Prefetch-Control",
              value: "off"
            },
            {
              // Enforces HTTPS
              key: "Strict-Transport-Security",
              value: "max-age=31536000; includeSubDomains"
            }
          ]
        }
      ]
    }
  }
export default nextConfig;
