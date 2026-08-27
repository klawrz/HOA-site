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
};

export default nextConfig;
