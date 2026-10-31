import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/cctv-jkt-map/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    // The shell exports NODE_ENV=production, which makes React load its
    // production build (no React.act) and breaks @testing-library/react.
    env: { NODE_ENV: "test" },
  },
});
