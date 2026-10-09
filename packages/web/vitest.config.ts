import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "web",
    globals: true,
    environment: "jsdom",
    include: ["test/**/*.test.ts?(x)"],
  },
});
