/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

/** Read public/_headers (Cloudflare Pages format) so `vite preview` behaves like production. */
function productionHeaders(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    for (const line of fs.readFileSync(path.resolve(__dirname, 'public/_headers'), 'utf8').split('\n')) {
      const m = /^\s+([A-Za-z-]+):\s*(.+)$/.exec(line)
      if (m) out[m[1]] = m[2].trim()
    }
    // Local preview only: the API runs on http://localhost, which production's https-only rule would block.
    const csp = 'Content-Security-Policy'
    if (out[csp]) out[csp] = out[csp].replace("connect-src 'self' https:", "connect-src 'self' https: http://localhost:*")
  } catch {
    /* no headers file: preview without them */
  }
  return out
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    headers: productionHeaders(),
  },
  build: {
    outDir: 'dist',
    // Source maps are not published with the production bundle.
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'e2e/**'],
    css: false,
  },
})
