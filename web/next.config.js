const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Necessario para output file tracing em setup com rootDirectory no Vercel
    outputFileTracingRoot: path.join(__dirname, '../'),
  },
};

module.exports = nextConfig;
