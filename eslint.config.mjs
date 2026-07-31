// eslint.config.mjs — ESLint 9 flat config (required by Next.js 15)
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/** @type {import("eslint").Linter.Config[]} */
const config = [
  { ignores: [".next/**", "out/**", "next-env.d.ts", "prisma/migrations/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default config;
