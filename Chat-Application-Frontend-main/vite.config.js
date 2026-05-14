import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 7001, // You can change this to 3000 if your backend is NOT on 3000
    strictPort: false,
  }
})
