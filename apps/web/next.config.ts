import type { NextConfig } from "next";
const config: NextConfig = { distDir: process.env.PACTRA_DIST_DIR || '.next', transpilePackages: ["@pactra/domain", "@pactra/database", "@pactra/integrations"], poweredByHeader: false };
export default config;
