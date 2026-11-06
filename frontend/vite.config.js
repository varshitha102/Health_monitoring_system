import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Dev proxy: lets the app run on a single origin, which removes the browser CORS
    // problems that broke every API call when the backend had no CORS middleware.
    // Only used when VITE_API_BASE_URL is empty (see src/config.js).
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    // Recharts + Leaflet are heavy; silence the noisy 500 kB warning.
    chunkSizeWarningLimit: 1200,
  },
});
