import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        "bg-secondary": "var(--color-bg-secondary)",
        ink: "var(--color-ink)",
        "ink-secondary": "var(--color-ink-secondary)",
        accent: "var(--color-accent)",
        line: "var(--color-line)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
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
        "card-hover": "0 8px 30px rgba(0, 0, 0, 0.08)",
      },
      letterSpacing: {
        heading: "-0.02em",
      },
    },
  },
  plugins: [],
};
export default config;
