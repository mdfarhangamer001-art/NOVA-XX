import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: {
      sourcemap: false,
      minify: true,
      rollupOptions: {
        external: ['vosk-koffi']
      }
    }
  },
  preload: {
    build: {
      sourcemap: false,
      minify: true
    }
  },
  renderer: {
    publicDir: resolve('src/renderer/src/public'),
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()],
    build: {
      sourcemap: false,
      minify: 'esbuild',
      cssMinify: true,
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/[hash].js',
          entryFileNames: 'assets/[hash].js',
          assetFileNames: 'assets/[hash][extname]',
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('three')) return 'vendor-three'
              if (id.includes('@react-three')) return 'vendor-react-three'
              if (id.includes('firebase')) return 'vendor-firebase'
              if (id.includes('framer-motion')) return 'vendor-motion'
              if (id.includes('lucide-react')) return 'vendor-lucide'
              if (id.includes('react-icons')) return 'vendor-icons'
              if (id.includes('gsap')) return 'vendor-gsap'
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router'))
                return 'vendor-react'
              return 'vendor'
            }
          }
        }
      }
    }
  }
})
