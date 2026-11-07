import type { Config } from "tailwindcss";
import fs from "fs";
import path from "path";


// ── Brand palettes ───────────────────────────────────────────────────────────
// Aries is built in. Another storefront (src/brand) can bring its own palette
// and fonts in src/brands/<id>/tailwind.ts; VITE_BRAND picks one at build time,
// so every class (ember-500, obsidian, slate-950...) takes that brand's colours.
type BrandTheme = { theme?: { fontFamily: Record<string, string[]>; colors: Record<string, unknown> }; extraColors?: Record<string, string> };
const brandsDir = path.join(__dirname, "src/brands");
const brandThemes: Record<string, BrandTheme> = fs.existsSync(brandsDir)
  ? Object.fromEntries(
      fs.readdirSync(brandsDir)
        .filter((id) => fs.existsSync(path.join(brandsDir, id, "tailwind.ts")))
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        .map((id) => [id, require(path.join(brandsDir, id, "tailwind.ts")) as BrandTheme]),
    )
  : {};

const ARIES = {
  // Aries AI brand fonts: Cormorant Garamond (headlines), Helvetica Neue
  // (sub-headlines and body; system font, not downloaded), Courier Prime (code).
  fontFamily: {
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', '"Times New Roman"', 'serif'],
        mono: ['"Courier Prime"', 'ui-monospace', 'Menlo', 'monospace'],
      },
  colors: {
        // Aries AI palette. Use these (or the theme tokens below), not stock Tailwind hues.
        obsidian: "#0E0C0F",
        cream: "#EDE8E1",
        charcoal: "#2C2830",
        "warm-white": "#F7F4F0",
        "warm-stone": "#7A6355",
        "mid-gray": "#6B6570",
        silver: "#A8A5AE",
        mist: "#D8D3DE",
        // Ember scale around the brand Ember (#CC6633 = 500). For small text on
        // Cream use 600 or darker (contrast).
        ember: {
          DEFAULT: "#CC6633",
          50: "#FBF1EB",
          100: "#F6E0D3",
          200: "#EDC1A7",
          300: "#E3A17B",
          400: "#D9824F",
          500: "#CC6633",
          600: "#A44E24",
          700: "#833E1D",
          800: "#633017",
          900: "#452111",
          950: "#2A1409",
        },
        // White and black are warmed to the brand's Warm White and Obsidian.
        white: "#F7F4F0",
        black: "#0E0C0F",
        // Neutrals mapped to the brand's warm greys (Warm White → Obsidian).
        ...Object.fromEntries(
          ["gray", "slate", "zinc", "neutral"].map((name) => [
            name,
            {
              50: "#F7F4F0",
              100: "#EDE8E1",
              200: "#D8D3DE",
              300: "#C2BEC6",
              400: "#A8A5AE",
              500: "#87828C",
              600: "#6B6570",
              700: "#4D4852",
              800: "#2C2830",
              900: "#1C191F",
              950: "#0E0C0F",
            },
          ]),
        )
  },
};


const THEME = brandThemes[process.env.VITE_BRAND ?? ""]?.theme ?? ARIES;
// Extra colour names from every brand folder, for brand-specific pages.
const EXTRA_COLORS = Object.assign({}, ...Object.values(brandThemes).map((b) => b.extraColors ?? {}));

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: THEME.fontFamily,
      colors: {
        ...THEME.colors,
        ...EXTRA_COLORS,
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
