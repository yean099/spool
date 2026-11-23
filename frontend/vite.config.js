import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // En desarrollo local, redirige las llamadas /health y /pedidos al backend
      '/health': 'http://localhost:8080',
      '/pedidos': 'http://localhost:8080',
    }
  }
})
