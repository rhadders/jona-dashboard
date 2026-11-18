import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";
import tailwindcssAnimate from "tailwindcss-animate";

/*
 * Jona design system (overgenomen uit TirgumAI, ADR 1 daar). De waarden staan
 * als HSL-triplets in `src/app/globals.css`; hier worden ze kleuren met een
 * alfakanaal, zodat `bg-primary/20` blijft werken. Tokens met een eigen
 * `--x-alpha` (randen in donker, de scrim) vermenigvuldigen die met de
 * opaciteit van de klasse.
 */
const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;
const translucent = (name: string) =>
  `hsl(var(--${name}) / calc(var(--${name}-alpha) * <alpha-value>))`;

/** Een token met `-soft`, `-strong` en `-foreground` ernaast. */
const status = (name: string) => ({
  DEFAULT: token(name),
  foreground: token(`${name}-foreground`),
  soft: token(`${name}-soft`),
  strong: token(`${name}-strong`),
});

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Lora en Jost zijn in het Jona-systeem zelf een substitutie (ADR 1 in TirgumAI).
        sans: ["var(--font-sans)", "var(--font-sans-ext)", "Century Gothic", "Avenir Next", ...defaultTheme.fontFamily.sans],
        serif: ["var(--font-serif)", "var(--font-serif-ext)", "Georgia", "Times New Roman", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      // Typeschaal: grote terts (1.25) op 17px.
      fontSize: {
        "2xs": ["12px", { lineHeight: "1.4" }],
        xs: ["13px", { lineHeight: "1.5" }],
        sm: ["15px", { lineHeight: "1.5" }],
        base: ["17px", { lineHeight: "1.65" }],
        lg: ["20px", { lineHeight: "1.65" }],
        xl: ["25px", { lineHeight: "1.28" }],
        "2xl": ["31px", { lineHeight: "1.28" }],
        "3xl": ["39px", { lineHeight: "1.12" }],
        "4xl": ["49px", { lineHeight: "1.12" }],
      },
      colors: {
        background: token("background"),
        foreground: token("foreground"),
        card: { DEFAULT: token("card"), foreground: token("card-foreground") },
        popover: { DEFAULT: token("popover"), foreground: token("popover-foreground") },
        primary: {
          DEFAULT: token("primary"),
          foreground: token("primary-foreground"),
          hover: token("primary-hover"),
        },
        secondary: {
          DEFAULT: token("secondary"),
          foreground: token("secondary-foreground"),
          hover: token("secondary-hover"),
        },
        muted: { DEFAULT: token("muted"), foreground: token("muted-foreground") },
        accent: { DEFAULT: token("accent"), foreground: token("accent-foreground") },
        destructive: status("destructive"),
        success: status("success"),
        warning: status("warning"),
        border: translucent("border"),
        input: translucent("input"),
        ring: token("ring"),
        scrim: translucent("scrim"),
        brand: {
          DEFAULT: token("brand"),
          foreground: token("brand-foreground"),
          hover: token("brand-hover"),
          soft: token("brand-soft"),
          strong: token("brand-strong"),
        },
        ink: {
          DEFAULT: token("ink"),
          foreground: token("ink-foreground"),
          muted: token("ink-muted"),
          accent: token("ink-accent"),
        },
        sidebar: {
          DEFAULT: token("sidebar"),
          foreground: token("sidebar-foreground"),
          accent: token("sidebar-accent"),
          "accent-foreground": token("sidebar-accent-foreground"),
          border: translucent("sidebar-border"),
        },
      },
      // Een kale `ring` is teal, en de offset volgt de achtergrond (ook in donker).
      ringColor: { DEFAULT: token("ring") },
      ringOffsetColor: { DEFAULT: token("background") },
      // Velden 8px, meldingen 12px, kaarten 18px, dialogen 28px, knoppen rond.
      borderRadius: {
        xs: "4px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "18px",
        "2xl": "28px",
      },
      // Navy getint en laag contrast, nooit neutraal zwart.
      boxShadow: {
        xs: "0 1px 2px rgb(7 58 86 / 0.06)",
        sm: "0 2px 6px rgb(7 58 86 / 0.07)",
        DEFAULT: "0 2px 6px rgb(7 58 86 / 0.07)",
        md: "0 8px 20px -6px rgb(7 58 86 / 0.12)",
        lg: "0 20px 44px -16px rgb(7 58 86 / 0.18)",
        xl: "0 20px 44px -16px rgb(7 58 86 / 0.18)",
      },
      // 140ms voor hovers, 220ms voor toggles; ease-out, nooit een bounce.
      transitionDuration: {
        DEFAULT: "140ms",
        toggle: "220ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        out: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    // Op een touchscreen worden bedieningselementen minstens 40px (Tailwind 4 heeft
    // deze variant ingebouwd).
    plugin(({ addVariant }) => {
      addVariant("pointer-coarse", "@media (pointer: coarse)");
    }),
  ],
};

export default config;
