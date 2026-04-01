import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  
  // 🚀 Turbopack configuration (faster, less memory)
  turbopack: {
    root: __dirname // Set the root directory for Turbopack
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // 🔥 MEMORY OPTIMIZATION FOR DEVELOPMENT
  experimental: {
    // Reduce memory usage during development
    isrMemoryCacheSize: 0, // Disable ISR cache in dev (save RAM)
    workerThreads: false, // Disable worker threads (save RAM)
    cpus: 1, // Limit CPU cores used (adjust based on your CPU)
  },

  // 🔥 WEBPACK OPTIMIZATION (if not using turbopack)
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Reduce memory usage in development
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        chunkIds: 'named',
        minimize: false,
      };

      // Limit parallelism to reduce memory
      config.parallelism = 1;

      // Cache configuration for faster rebuilds with less memory
      config.cache = {
        type: 'filesystem',
        compression: 'gzip', // Compress cache to save disk space
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      };
    }

    return config;
  },

  // 🔥 DISABLE FEATURES YOU DON'T NEED IN DEV
  swcMinify: true, // Use SWC minifier (faster, less memory than Terser)
  
  // Reduce overhead in development
  productionBrowserSourceMaps: false,
  
  // Optimize page loading
  reactStrictMode: true,
  
  // Reduce memory for static optimization
  optimizeFonts: false, // Disable in dev for less memory
};

export default nextConfig;