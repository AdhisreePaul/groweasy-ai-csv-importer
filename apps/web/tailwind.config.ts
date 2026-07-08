import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        leaf: "rgb(var(--color-leaf) / <alpha-value>)",
        "leaf-dark": "rgb(var(--color-leaf-dark) / <alpha-value>)",
        mint: "rgb(var(--color-mint) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        soft: "rgb(var(--color-soft) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        sky: "rgb(var(--color-sky) / <alpha-value>)",
        "sky-soft": "rgb(var(--color-sky-soft) / <alpha-value>)",
        "sky-ink": "rgb(var(--color-sky-ink) / <alpha-value>)",
        amber: "rgb(var(--color-amber) / <alpha-value>)",
        "amber-soft": "rgb(var(--color-amber-soft) / <alpha-value>)",
        "amber-ink": "rgb(var(--color-amber-ink) / <alpha-value>)",
        rose: "rgb(var(--color-rose) / <alpha-value>)"
      }
    }
  },
  plugins: []
};

export default config;
