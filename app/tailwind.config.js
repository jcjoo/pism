/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#8B5A96',
          DEFAULT: '#5A189A',
          dark: '#3C096C',
        },
        secondary: {
          light: '#C4D680',
          DEFAULT: '#B2CA63',
          dark: '#758C36',
        },
        light: {
          DEFAULT: '#EAE3F0',
          dark: '#E1DAE8',
        },
        dark: {
          light: '#222B14',
          DEFAULT: '#0E0F0C',
        },
        success: '#00E31A',
        danger: '#DF1515',
      },
    },
  },
  plugins: [],
};
