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
        // Brand: shades of black + orange
        primary: "#0B0F12", // deep near-black
        accent: "#F97316",  // orange-500
        success: "#16A34A",
        warning: "#F59E0B",
        destructive: "#DC2626",
      },
    },
  },
  plugins: [],
};

export default config;
