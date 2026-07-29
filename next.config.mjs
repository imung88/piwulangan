/** @type {import('next').NextConfig} */
const nextConfig = {
  // libsql ships native binaries that webpack cannot bundle
  serverExternalPackages: ["@prisma/adapter-libsql", "@libsql/client", "libsql"],
};

export default nextConfig;
