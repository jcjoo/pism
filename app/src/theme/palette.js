// Single source of truth for the app's color palette.
// tailwind.config.js consumes this for className/NativeWind utilities.
// theme/color.ts consumes this for JS-side color values (icon `color`, `style={{}}`, etc).
module.exports = {
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
  success: {
    light: '#E6F7EC',
    DEFAULT: '#1B8A3D',
  },
  danger: {
    light: '#FFF0F0',
    DEFAULT: '#DF1515',
  },
  warning: {
    light: '#FFF8E6',
    DEFAULT: '#FF8C00',
    dark: '#B86E00',
  },
  info: '#4285F4',
};
