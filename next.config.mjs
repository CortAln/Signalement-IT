/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Les photos sont envoyées en base64 dans le JSON de création d'incident.
  // Limite confortable pour 3 photos compressées côté client (~150 Ko chacune).
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
