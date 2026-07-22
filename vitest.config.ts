import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Testes de integração (tenant-db) usam o banco real do .env.
    env: loadEnv("", process.cwd(), ""),
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
