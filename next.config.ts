/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.partylink.co' }],
        destination: 'https://partylink.co/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
