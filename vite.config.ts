import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), UnoCSS()],
  base: process.env.GITHUB_PAGES ? '/ip6wtf/' : '/',
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  }
})
