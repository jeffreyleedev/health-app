import type { NextConfig } from "next";
import { HOME_PATH } from "./src/lib/app-info";

const nextConfig: NextConfig = {
  // There's no page at "/": it sends you to Weigh-ins. The old Calculators
  // page became the BMR/TDEE section of Calories, so bookmarks go there.
  // Temporary (307) so browsers don't cache them if pages move again. These
  // run before the proxy, so signed-out visitors still end up at /sign-in.
  async redirects() {
    return [
      { source: "/", destination: HOME_PATH, permanent: false },
      { source: "/calculators", destination: "/calories", permanent: false },
    ];
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
