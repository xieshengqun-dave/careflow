import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
        cf: {
          "primary-50": "hsl(var(--cf-primary-50))",
          "primary-600": "hsl(var(--cf-primary-600))",
          "primary-700": "hsl(var(--cf-primary-700))",
          "primary-800": "hsl(var(--cf-primary-800))",
          "green-50": "hsl(var(--cf-green-50))",
          "green-500": "hsl(var(--cf-green-500))",
          "green-600": "hsl(var(--cf-green-600))",
          "purple-50": "hsl(var(--cf-purple-50))",
          "purple-600": "hsl(var(--cf-purple-600))",
          "amber-50": "hsl(var(--cf-amber-50))",
          "amber-500": "hsl(var(--cf-amber-500))",
          "amber-700": "hsl(var(--cf-amber-700))",
          "red-50": "hsl(var(--cf-red-50))",
          "red-500": "hsl(var(--cf-red-500))",
          "red-600": "hsl(var(--cf-red-600))",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "cf-hero": "1.25rem",
        "cf-pill": "9999px",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
