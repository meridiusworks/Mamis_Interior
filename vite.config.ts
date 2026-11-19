import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Keep the 3D stack out of the pages that never render a canvas.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/[\\/](three|@react-three)[\\/]/.test(id)) return 'three'
            if (/[\\/](gsap|@gsap)[\\/]/.test(id)) return 'gsap'
          }
        },
      },
    },
    // three + fiber + drei is one ~1.3 MB chunk, fetched only by the 3D pages.
    chunkSizeWarningLimit: 1400,
  },
})
