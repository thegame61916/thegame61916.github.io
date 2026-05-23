import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/main.js',
        chunkFileNames: 'assets/chunk-[name].js',
        assetFileNames: ({ name }) => {
          if (name && name.endsWith('.css')) return 'assets/main.css';
          return 'assets/[name][extname]';
        }
      }
    }
  }
});
