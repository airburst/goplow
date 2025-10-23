import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import devtools from "solid-devtools/vite";

export default defineConfig({
  plugins: [devtools(), solidPlugin(), tailwindcss()],
  server: {
    port: 4000,
    proxy: {
      // Proxy API requests to the Go server (dev mode only)
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      // Proxy schema requests to the Go server (dev mode only)
      "/schemas": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "esnext",
    // Use dev output path if DEV environment variable is set, otherwise use production path
    outDir: process.env.DEV ? "../internal/static-dev" : "../internal/static",
    emptyOutDir: false,
  },
});
