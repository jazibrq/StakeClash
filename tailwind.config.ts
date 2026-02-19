import type { Config } from "tailwindcss";

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
      colors: {
        border: "hsl(var(--border))",
        divider: "hsl(var(--divider))",
        "border-glow": "hsl(var(--border-glow))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
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
          elevated: "hsl(var(--card-elevated))",
          highlight: "hsl(var(--card-highlight))",
        },
        surface: {
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
          4: "hsl(var(--surface-4))",
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
        // ── Resource color tokens ──────────────────────────────
        resource: {
          ore:              "#6B7280",
          "ore-highlight":  "#9CA3AF",
          gold:             "#FBBF24",
          "gold-highlight": "#FCD34D",
          diamond:          "#38BDF8",
          "diamond-glow":   "#7DD3FC",
          mana:             "#A855F7",
          "mana-glow":      "#C084FC",
        },
        // ── Action color tokens ────────────────────────────────
        action: {
          primary: "#EF4444",
          hover:   "#F87171",
          success: "#22C55E",
          warning: "#F59E0B",
          danger:  "#F87171",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        // Display / game-styled headings, buttons, nav labels
        display: [
          'Pixelify Sans',
          'system-ui',
          'sans-serif',
        ],
        // UI / body / paragraph text
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        // Numeric stats, balances, addresses — Inter with tabular figures
        mono: [
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        // Primary glow — red (#EF4444)
        'glow-primary':        '0 0 20px hsl(0 84% 60% / 0.3), 0 0 40px hsl(0 84% 60% / 0.1)',
        'glow-primary-strong': '0 0 30px hsl(0 84% 60% / 0.5), 0 0 60px hsl(0 84% 60% / 0.2)',
        'glow-primary-subtle': '0 0 10px hsl(0 84% 60% / 0.15)',
        // Legacy aliases (keep for backwards compat)
        'glow-cyan':        '0 0 20px hsl(0 84% 60% / 0.3), 0 0 40px hsl(0 84% 60% / 0.1)',
        'glow-cyan-strong': '0 0 30px hsl(0 84% 60% / 0.5), 0 0 60px hsl(0 84% 60% / 0.2)',
        'glow-cyan-subtle': '0 0 10px hsl(0 84% 60% / 0.15)',
        // Resource glows
        'glow-gold':    '0 0 16px hsl(38 96% 56% / 0.4)',
        'glow-diamond': '0 0 16px hsl(199 89% 48% / 0.4)',
        'glow-mana':    '0 0 16px hsl(271 91% 65% / 0.4)',
        'glow-ore':     '0 0 12px hsl(220 9% 46% / 0.3)',
        // Utility
        'inset-border': 'inset 0 1px 0 0 hsl(var(--border) / 0.5)',
        'surface': '0 4px 6px -1px hsl(0 0% 0% / 0.8), 0 2px 4px -2px hsl(0 0% 0% / 0.8)',
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
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(185 100% 50% / 0.3)" },
          "50%": { boxShadow: "0 0 30px hsl(185 100% 50% / 0.5)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "shimmer": "shimmer 2s linear infinite",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-cyan': 'linear-gradient(135deg, hsl(185 100% 50%), hsl(195 85% 55%))',
        'gradient-surface': 'linear-gradient(180deg, hsl(var(--card-elevated)), hsl(var(--card)))',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
