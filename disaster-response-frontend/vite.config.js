import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // If you get SSL errors calling your local API, uncomment this:
    // proxy: {
    //   '/api': { target: 'https://localhost:7129', changeOrigin: true, secure: false },
    //   '/hubs': { target: 'https://localhost:7129', changeOrigin: true, secure: false, ws: true },
    // },
  },
});
