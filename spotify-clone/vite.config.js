import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Browser "localhost" is IPv6 on this machine; Docker publishes the API on IPv4 only.
    proxy: {
      '/v1': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
})
