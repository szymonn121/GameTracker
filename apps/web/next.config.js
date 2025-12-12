/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.steamstatic.com' },
      { protocol: 'https', hostname: '**.igdb.com' },
      { protocol: 'https', hostname: '**.cloudflare-ipfs.com' },
      { protocol: 'https', hostname: '**.akamaihd.net' },
      { protocol: 'https', hostname: 'via.placeholder.com' }
    ]
  }
};

module.exports = nextConfig;
