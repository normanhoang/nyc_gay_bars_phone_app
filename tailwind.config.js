/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Pride-accent palette used across the app.
        primary: {
          DEFAULT: "#e0218a", // magenta
          dark: "#b81873",
        },
        ink: {
          DEFAULT: "#0b0b12", // near-black background
          soft: "#16161f",
          card: "#1e1e2a",
        },
      },
    },
  },
  plugins: [],
};
