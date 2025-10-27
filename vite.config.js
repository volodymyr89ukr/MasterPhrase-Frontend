import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/auth": "http://localhost:5000",
      "/api": "http://localhost:5000", // <-- тут порт твого бекенда
    },
  },
  resolve: {
    alias: {
      // Коли код просить '@react-native-async-storage/async-storage',
      // Vite підключає 'localforage'
      "@react-native-async-storage/async-storage": "localforage",
    },
  },
});
