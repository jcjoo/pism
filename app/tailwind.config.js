/** @type {import('tailwindcss').Config} */
const palette = require('./src/theme/palette');

module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: palette,
    },
  },
  plugins: [],
};
