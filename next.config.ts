import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@libsql/client",
    "@libsql/hrana-client",
    "@libsql/isomorphic-ws",
    "@libsql/isomorphic-fetch",
    "libsql",
  ],
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          // CSP is currently global. 'unsafe-eval' + 'wasm-unsafe-eval' and the
          // jsdelivr origins exist for the free in-browser code runner only: the
          // JS engine uses `new Function` and Pyodide compiles WASM (both inside a
          // blob: Worker, which inherits this document CSP). 'unsafe-inline' predates
          // this. FOLLOW-UP (tracked, non-blocking): scope the eval/CDN/worker
          // directives to the practice route(s) (/problems/:slug*) and serve a
          // stricter CSP everywhere else, to shrink the site-wide XSS surface.
          // Untrusted user code already executes only inside the sandboxed Worker.
          key: "Content-Security-Policy",
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://avatars.githubusercontent.com; font-src 'self'; worker-src 'self' blob:; connect-src 'self' https://cdn.jsdelivr.net; frame-ancestors 'none';",
        },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],
};

export default nextConfig;
