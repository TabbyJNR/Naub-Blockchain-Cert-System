/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // Applies to every route in the app
        source: "/:path*",
        headers: [
          // Prevents the site from being embedded in an <iframe> on another
          // domain, which blocks clickjacking attacks (e.g. an attacker
          // overlaying invisible buttons over the real admin dashboard).
          { key: "X-Frame-Options", value: "DENY" },

          // Stops the browser from guessing content types, which prevents
          // certain file-upload-based attacks where a malicious file is
          // served as if it were a different, more dangerous, type.
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Forces the browser to only ever visit this site over HTTPS,
          // even if a link or bookmark points to an old http:// URL.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },

          // Limits how much referrer information is sent to other sites
          // when a user clicks a link away from this app (e.g. an Etherscan
          // or IPFS gateway link), so certificate IDs in the URL aren't
          // leaked to third-party analytics on the destination site.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Disables browser features this app never uses, reducing the
          // attack surface if a malicious script were ever injected.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
}

export default nextConfig
