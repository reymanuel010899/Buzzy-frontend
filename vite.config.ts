import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  define: {
    'process.env': {}
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // Aquí cambiamos a path.resolve
      three: 'three', // Asegúrate de que Three.js se resuelva correctamente
    },

  },
  plugins: [
    tailwindcss(),
  ],
})
