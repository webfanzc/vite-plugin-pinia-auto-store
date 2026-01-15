import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import piniaAutoStore from '../src/index.ts'

export default defineConfig({
  plugins: [
    vue(),
    piniaAutoStore({
      storeDir: 'store',
      output: 'use-store.ts',
      exclude: ['**/index.ts']
    }),
  ],
})
