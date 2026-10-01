import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--rgb-bg) / <alpha-value>)",
        canvas: "rgb(var(--rgb-canvas) / <alpha-value>)",
        "bg-secondary": "rgb(var(--rgb-canvas) / <alpha-value>)",
        ink: "rgb(var(--rgb-ink) / <alpha-value>)",
        "ink-secondary": "rgb(var(--rgb-ink-secondary) / <alpha-value>)",
        accent: "rgb(var(--rgb-accent) / <alpha-value>)",
        "accent-strong": "rgb(var(--rgb-accent-strong) / <alpha-value>)",
        "accent-soft": "rgb(var(--rgb-accent-soft) / <alpha-value>)",
        line: "rgb(var(--rgb-line) / <alpha-value>)",
        night: "rgb(var(--rgb-night) / <alpha-value>)",
        success: "rgb(var(--rgb-success) / <alpha-value>)",
        warning: "rgb(var(--rgb-warning) / <alpha-value>)",
        danger: "rgb(var(--rgb-danger) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      borderRadius: {
        pill: "980px",
        btn: "12px",
        card: "24px",
      },
      boxShadow: {
        "card-hover": "0 14px 40px rgba(16, 24, 40, 0.10)",
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 6px 20px rgba(16, 24, 40, 0.05)",
        pop: "0 20px 60px rgba(16, 24, 40, 0.14)",
        glow: "0 10px 30px rgba(0, 113, 227, 0.28)",
      },
      letterSpacing: {
        heading: "-0.02em",
      },
    },
  },
  plugins: [],
};
export default config;
