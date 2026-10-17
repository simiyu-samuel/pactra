import type { NextConfig } from "next";
const config: NextConfig = { transpilePackages: ["@pactra/domain", "@pactra/database", "@pactra/integrations"], poweredByHeader: false };
export default config;
