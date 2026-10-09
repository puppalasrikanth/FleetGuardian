/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
      colors: {
        brand: { 50: "#eef6ff", 100: "#d9eaff", 400: "#5aa2ff", 500: "#2f7fff", 600: "#1d63e6", 700: "#184fba" },
      },
    },
  },
  plugins: [],
};
