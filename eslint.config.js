import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".agents/**",
      ".agent/**",
      ".claude/**",
      ".husky/**",
      "eslint-plugin-bidocs-pdf/**",
      "*.config.js",
      "**/*.ts",
      "**/*.tsx",
    ],
  },
]);

