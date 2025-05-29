import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), UnoCSS()],
//  base: '/',
  base: process.env.GITHUB_PAGES ? '/ip6wtf/' : '/',
  root: 'src',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: './src/index.html',
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
