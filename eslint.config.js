import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import globals from "globals";
import prettierPlugin from "eslint-plugin-prettier";

export default defineConfig([
  {
    ignores: ["build/", "node_modules/"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    plugins: { js, prettier: prettierPlugin },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
    rules: {
      "prettier/prettier": "error",
    },
  },
  tseslint.configs.recommended,
]);
