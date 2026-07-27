// eslint.config.mjs — ESLint 9 flat config (required by Next.js 15)
import next from "eslint-config-next";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...next(["core-web-vitals", "typescript"]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
