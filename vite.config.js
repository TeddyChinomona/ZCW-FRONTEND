import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['zcw-frontend-production.up.railway.app']
  },
  // If you see this error during local development/linking, 
  // you can also add it to the server block:
  server: {
    allowedHosts: ['zcw-frontend-production.up.railway.app']
  }
})
