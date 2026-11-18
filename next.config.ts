import type { NextConfig } from "next";
import { HOME_PATH } from "./src/lib/app-info";

const nextConfig: NextConfig = {
  // There's no page at "/": it sends you to Weigh-ins. Temporary (307) so
  // browsers don't cache it if the home page changes later. Runs before the
  // proxy, so signed-out visitors still end up at /sign-in.
  async redirects() {
    return [{ source: "/", destination: HOME_PATH, permanent: false }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
