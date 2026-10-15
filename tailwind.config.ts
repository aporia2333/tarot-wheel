import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink-rgb) / <alpha-value>)",
        night: "rgb(var(--surface-rgb) / <alpha-value>)",
        ember: "rgb(var(--accent-rgb) / <alpha-value>)",
        mist: "rgb(var(--text-rgb) / <alpha-value>)",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(0, 0, 0, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
