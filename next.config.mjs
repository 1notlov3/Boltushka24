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
              key: "Strict-Transport-Security",
              value: "max-age=31536000; includeSubDomains",
            },
            {
              key: "X-Frame-Options",
              value: "SAMEORIGIN",
            },
            {
              key: "X-Content-Type-Options",
              value: "nosniff",
            },
            {
              key: "X-DNS-Prefetch-Control",
              value: "off",
            },
            {
              key: "Permissions-Policy",
              value: "geolocation=(), browsing-topics=()",
            },
          ],
        },
      ];
    },
  }
export default nextConfig;
