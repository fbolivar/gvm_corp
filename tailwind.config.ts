import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Azul corporativo GVM (#0096E6). Redefinimos la escala `indigo` — que
        // era el color primario de facto en toda la app — para que TODOS los
        // `indigo-*` existentes rendericen en el azul de marca. `indigo-600`
        // (el de los botones) queda exactamente en #0096E6.
        indigo: {
          50: "#E9F6FE",
          100: "#CFEEFD",
          200: "#A3DDFB",
          300: "#6BCAF8",
          400: "#2FB2F1",
          500: "#0FA1EC",
          600: "#0096E6",
          700: "#0777B8",
          800: "#0B5F93",
          900: "#124F78",
          950: "#0B3150",
        },
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
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'premium': '0 20px 50px rgba(0,0,0,0.05)',
        'active': '0 10px 25px -5px rgba(0, 150, 230, 0.3)',
      }
    },
  },
  plugins: [],
}

export default config
