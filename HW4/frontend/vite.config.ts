import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The FastAPI backend runs on 8000 (uvicorn main:app --reload --port 8000). Proxying keeps the browser on one origin,
// so no API key or backend URL is ever needed in frontend code.
const BACKEND = 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': BACKEND,
      '/media': BACKEND,
    },
  },
})
