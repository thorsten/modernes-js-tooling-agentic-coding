import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "shared-types",
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts?(x)"],
  },
});
