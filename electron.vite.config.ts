import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import JavaScriptObfuscator from 'javascript-obfuscator'

function obfuscatePlugin() {
  return {
    name: 'vite-plugin-javascript-obfuscator',
    enforce: 'post' as const,
    generateBundle(_options, bundle) {
      for (const [fileName, file] of Object.entries(bundle)) {
        if (
          fileName.endsWith('.js') &&
          file.type === 'chunk' &&
          file.code &&
          !fileName.includes('vendor-')
        ) {
          console.log(`[Obfuscating] ${fileName}...`)
          try {
            const result = JavaScriptObfuscator.obfuscate(file.code, {
              compact: true,
              controlFlowFlattening: true,
              controlFlowFlatteningThreshold: 0.75,
              numbersToExpressions: true,
              simplify: true,
              stringArray: true,
              stringArrayThreshold: 0.75
            })
            file.code = result.getObfuscatedCode()
          } catch (err) {
            console.error(`[Obfuscation Error] Failed to obfuscate ${fileName}:`, err)
          }
        }
      }
    }
  }
}

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
    plugins: [react(), tailwindcss(), obfuscatePlugin()],
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
              if (id.includes('react-router')) return 'vendor-router'
              if (id.includes('react-dom')) return 'vendor-react-dom'
              if (id.match(/\/node_modules\/react\//)) return 'vendor-react'
              return 'vendor'
            }
          }
        }
      }
    }
  }
})
