/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.squarespace-cdn.com",
      },
    ],
  },

  async redirects() {
    return [
      // The daily-updates page lived at /tracker until it was renamed. Anyone
      // with a bookmark, or a link in an old email or chat message, would
      // otherwise get a 404. Permanent so browsers and crawlers stop asking.
      //
      // The wildcard carries the query string through, which matters for
      // /tracker?logUpdate=1 — the deep link that opens the log form.
      { source: "/tracker", destination: "/daily-updates", permanent: true },
      { source: "/tracker/:path*", destination: "/daily-updates/:path*", permanent: true },
    ];
  },
};

module.exports = nextConfig;
