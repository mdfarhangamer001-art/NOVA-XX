import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import JavaScriptObfuscator from 'javascript-obfuscator'
import type { OutputBundle, OutputChunk } from 'rollup'

function obfuscatePlugin(): Plugin {
  return {
    name: 'vite-plugin-javascript-obfuscator',
    enforce: 'post',
    generateBundle(_options, bundle: OutputBundle) {
      for (const fileName in bundle) {
        const file = bundle[fileName]
        
        if (fileName.endsWith('.js') && file.type === 'chunk') {
          const chunk = file as OutputChunk
          
          console.log(`[Obfuscating] ${fileName}...`)
          try {
            const result = JavaScriptObfuscator.obfuscate(chunk.code, {
              compact: true,
              controlFlowFlattening: true,
              controlFlowFlatteningThreshold: 0.75,
              numbersToExpressions: true,
              simplify: true,
              stringArray: true,
              stringArrayThreshold: 0.75
            })
            chunk.code = result.getObfuscatedCode()
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
          assetFileNames: 'assets/[hash][extname]'
        }
      }
    }
  }
})
            
