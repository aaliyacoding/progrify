const createNextPluginPreval = require("next-plugin-preval/config");
const withNextPluginPreval = createNextPluginPreval();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  serverRuntimeConfig: {
    livekitApiKey: process.env.LIVEKIT_API_KEY,
    livekitApiSecret: process.env.LIVEKIT_API_SECRET,
  },
  publicRuntimeConfig: {
    livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
  },
};

module.exports = withNextPluginPreval(nextConfig);
