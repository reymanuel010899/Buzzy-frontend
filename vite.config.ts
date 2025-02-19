import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // Aquí cambiamos a path.resolve
    },
  },
  plugins: [
    tailwindcss(),
  ],
})
