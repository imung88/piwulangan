import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Segoe UI Variable"',
          '"Segoe UI"',
          "var(--font-inter)",
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        metro: {
          blue: "var(--metro-blue)",
          "blue-hover": "var(--metro-blue-hover)",
          "blue-light": "var(--metro-blue-light)",
          "chrome-dark": "var(--metro-chrome-dark)",
          green: "var(--metro-green)",
          "green-hover": "var(--metro-green-hover)",
          "green-light": "var(--metro-green-light)",
          orange: "var(--metro-orange)",
          "orange-hover": "var(--metro-orange-hover)",
          error: "var(--metro-error)",
          bg: "var(--metro-bg)",
          surface: "var(--metro-surface)",
          border: "var(--metro-border)",
          text: "var(--metro-text)",
          "text-secondary": "var(--metro-text-secondary)",
          "role-admin": "var(--metro-role-admin)",
          "role-instructor": "var(--metro-role-instructor)",
          "role-student": "var(--metro-role-student)",
          "role-guardian": "var(--metro-role-guardian)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
