/** @type {import('next').NextConfig} */
const nextConfig = {
  // three/examples se importa como ESM; Next lo transpila para el bundle del cliente
  transpilePackages: ['three'],
  images: {
    // Retratos y logos son estáticos de /public
    unoptimized: false,
  },
}

export default nextConfig
