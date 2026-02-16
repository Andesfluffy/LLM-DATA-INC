import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Noto Sans", "Ubuntu", "Cantarell", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        // Candy accent — refined rose
        candy: {
          50: "#fff1f3",
          100: "#ffe0e6",
          200: "#ffc6d1",
          300: "#ff9daf",
          400: "#ff637f",
          500: "#f43f5e",
          600: "#e11d48",
          700: "#be123c",
          800: "#9f1239",
          900: "#881337",
          950: "#4c0519",
        },
        // Grape — neutral black/gray for dark theme
        grape: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#a3a3a3",
          400: "#737373",
          500: "#525252",
          600: "#333333",
          700: "#262626",
          800: "#1a1a1a",
          900: "#0d0d0d",
          950: "#060606",
        },
        // Electric — subtle blue accent
        electric: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        // Mint
        mint: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        // Primary
        primary: "#000000",
        accent: "#f43f5e",
        "accent-light": "#ff637f",
        success: "#34d399",
        warning: "#fbbf24",
        destructive: "#f87171",
      },
    },
  },
  plugins: [],
};

export default config;
