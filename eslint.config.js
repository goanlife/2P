import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
  { ignores: ["dist", "node_modules"] },

  // ── Test files — vitest globals ──────────────────────────────────────
  {
    files: ["test/**/*.js", "test/**/*.jsx", "**/*.test.js", "**/*.spec.js", "**/setup.js", "**/setup.ts"],
    languageOptions: {
      globals: {
        vi: "readonly", describe: "readonly", it: "readonly", test: "readonly",
        expect: "readonly", beforeEach: "readonly", afterEach: "readonly",
        beforeAll: "readonly", afterAll: "readonly", global: "writable",
        setTimeout: "readonly", clearTimeout: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
    },
  },

  // ── Source files ─────────────────────────────────────────────────────
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // React Hooks rules — SOLO le regole stabili
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Errori critici
      "no-undef": "error",
      "no-unreachable": "error",
      "no-duplicate-imports": "error",
      "no-var": "error",

      // Warnings utili
      "no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      }],
      "prefer-const": "warn",
      "require-await": "warn",
      "no-async-promise-executor": "error",

      // React refresh — warn solo, non blocca
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // Disabilita regole troppo aggressive per questo codebase
      "react-hooks/react-compiler": "off",
    },
  },
];
