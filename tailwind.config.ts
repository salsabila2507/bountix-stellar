import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#030510",
          925: "#050817",
          900: "#081020",
          850: "#0d1730",
          800: "#121f3d",
          700: "#1b2b52",
        },
        aurora: {
          200: "#b9fbff",
          300: "#38e7ff",
          400: "#2d88ff",
          500: "#6c55ff",
          600: "#9c2dff",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        "aurora-soft": "0 0 42px rgba(56, 231, 255, 0.2)",
        "aurora-violet": "0 0 56px rgba(108, 85, 255, 0.22)",
        panel: "0 28px 90px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
