/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4f8",
          100: "#d9e4ef",
          200: "#b3c9df",
          500: "#2c5282",
          600: "#1e3a5f",
          700: "#172e4a",
          800: "#12243a",
          900: "#0c1828",
        },
        gold: {
          50: "#fdf8eb",
          100: "#f9edd0",
          200: "#f0d999",
          400: "#d4a843",
          500: "#c9a227",
          600: "#a8841f",
          700: "#87681a",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f4f6f9",
          border: "#e2e8f0",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', '"DM Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(12 24 40 / 0.06), 0 1px 2px -1px rgb(12 24 40 / 0.06)",
        elevated: "0 10px 40px -10px rgb(12 24 40 / 0.15)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};
