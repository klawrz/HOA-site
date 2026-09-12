import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next's server-action default (1MB) is well under the app's own
      // 15MB upload cap (see MAX_UPLOAD_SIZE in file-upload.ts) - a real
      // contract/roster PDF routinely exceeds 1MB, and hitting that limit
      // throws before the action's own code (and its try/catch) ever runs,
      // which the client saw as the upload UI hanging forever rather than
      // a clear error.
      bodySizeLimit: "15mb",
    },
  },
  // Baseline hardening headers - cheap, standard, and safe to ship without
  // the app-specific tuning a full Content-Security-Policy would need
  // (allowlisting the Anthropic API, fonts, etc.) - CSP is a deliberate
  // follow-up, not included here.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
