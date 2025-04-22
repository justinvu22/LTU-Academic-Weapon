/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#675EFF",   // Vibrant purple accent
        accent: "#FF5EEC",    // Bright pink accent
        dark: "#0F0F1A",      // Dark background for containers
        card: "#1C1C2A",      // For card elements
      },
    },
  },
  plugins: [],
};
