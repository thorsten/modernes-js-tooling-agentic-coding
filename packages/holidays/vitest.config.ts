import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "holidays",
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts?(x)"],
  },
});
