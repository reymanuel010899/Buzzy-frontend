import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  define: {
    'process.env': {}
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      three: 'three',
    },
  },
  plugins: [
    tailwindcss(),
  ],
  build: {
    sourcemap: false,
  },
  server: {
    sourcemapIgnoreList: () => true,
    allowedHosts: ['stinky-dust-five.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  css: {
    devSourcemap: false,
  },
})
