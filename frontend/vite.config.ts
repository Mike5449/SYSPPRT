import fs from "node:fs"
import path from "node:path"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"

// HTTPS on by default — required for camera access (getUserMedia) on mobile.
// Set VITE_HTTPS=false to serve plain HTTP if ever needed.
const useHttps = process.env.VITE_HTTPS !== "false"

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    // Relay API calls through this same (HTTPS) origin: the browser hits
    // /api on :5173 and Vite forwards to the backend over HTTP internally.
    // → no mixed-content block, no CORS, and the camera keeps working.
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
    ...(useHttps
      ? {
          https: {
            key: fs.readFileSync(path.resolve(__dirname, "localhost+3-key.pem")),
            cert: fs.readFileSync(path.resolve(__dirname, "localhost+3.pem")),
          },
        }
      : {}),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
  ],
})
