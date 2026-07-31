import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        // Values are CSS custom properties (see globals.css) so every
        // token below automatically swaps between light and dark palettes
        // based on the `.dark` class on <html> — components never need
        // dark: variants of their own.
        togo: {
          black: "var(--togo-black)",
          // rgb(var(--x) / <alpha-value>) rather than a bare var(): it's the
          // only form Tailwind can attach an opacity modifier to. Written this
          // way for every colour used as `…/10`, `…/[0.14]` etc, because a bare
          // var() makes those utilities emit nothing at all — which is how the
          // table row hovers ended up invisible.
          charcoal: "rgb(var(--togo-charcoal-rgb) / <alpha-value>)",
          surface: "rgb(var(--togo-surface-rgb) / <alpha-value>)",
          "surface-2": "rgb(var(--togo-surface-2-rgb) / <alpha-value>)",
          border: "var(--togo-border)",
          "border-strong": "var(--togo-border-strong)",
          blue: "rgb(var(--togo-blue-rgb) / <alpha-value>)",
          "blue-dark": "var(--togo-blue-dark)",
          "blue-muted": "var(--togo-blue-muted)",
          white: "var(--togo-white)",
          muted: "var(--togo-muted)",
          faint: "var(--togo-faint)",
        },
      },
      borderRadius: {
        md: "8px",
      },
    },
  },
  plugins: [],
};
export default config;
