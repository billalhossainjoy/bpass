import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { crx } from "@crxjs/vite-plugin"
import manifest from "./manifest.config"

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === "css") {
        return `chrome-extension://__MSG_@@extension_id__/${filename}`
      }
      return { relative: true }
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
})
