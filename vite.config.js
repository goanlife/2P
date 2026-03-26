import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000, // Bundle SPA complessa ~870KB è accettabile
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa le librerie pesanti in chunk dedicati
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
        }
      }
    }
  },
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
});
