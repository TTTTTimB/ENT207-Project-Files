import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    // 本地开发时把 /api 代理到后端（可用 VITE_DEV_API 覆盖）
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API || "http://localhost:3000",
        changeOrigin: true,
      },
    },
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
