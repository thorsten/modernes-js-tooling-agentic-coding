import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Nur Verzeichnisse mit eigener Konfiguration. Der Glob "packages/*" wuerde
    // auch Ordner einsammeln, die gerade nur Buildreste eines anderen Branch sind.
    projects: ["packages/*/vitest.config.ts"],
  },
});
