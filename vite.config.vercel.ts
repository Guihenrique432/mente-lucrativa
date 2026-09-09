import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Configuração de build para deploy na Vercel.
// Use este arquivo no comando de build da Vercel:
//   vite build --config vite.config.vercel.ts
//
// A configuração padrão (vite.config.ts) continua funcionando no ambiente
// Lovable; este arquivo só força o preset "vercel" do Nitro quando você
// hospedar o app fora da Lovable.

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
  },
});
