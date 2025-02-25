/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set reasonable server timeout
  serverRuntimeConfig: {
    serverTimeout: 30000, // 30 seconds
  },
  
  // Output standalone build for better Vercel compatibility
  output: 'standalone',
  
  // Disable image optimization if not needed
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
