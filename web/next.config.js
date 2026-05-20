/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dados estáticos resolvidos em build time — sem chamadas externas em runtime
  // O JSON em /data é importado diretamente via path relativo nos server components
};

module.exports = nextConfig;
