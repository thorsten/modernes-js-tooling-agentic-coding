import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "mcp-server",
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts?(x)"],
  },
});
