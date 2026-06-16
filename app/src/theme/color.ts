import palette from './palette';

// Same palette tailwind.config.js uses, exposed for places that can't take a
// className (icon `color` props, placeholderTextColor, shadowColor, etc).
// `DEFAULT` is renamed to `main` here since `colors.primary.DEFAULT` reads
// awkwardly in plain JS/TS expressions.
type Shade = string | { light?: string; DEFAULT?: string; dark?: string };

function withMain(shade: Shade) {
  if (typeof shade === 'string') return { main: shade };
  const { DEFAULT, ...rest } = shade;
  return { ...rest, main: DEFAULT };
}

export const colors = {
  primary: withMain(palette.primary),
  secondary: withMain(palette.secondary),
  light: withMain(palette.light),
  dark: withMain(palette.dark),
  success: withMain(palette.success),
  danger: withMain(palette.danger),
  warning: withMain(palette.warning),
  info: withMain(palette.info),
};
