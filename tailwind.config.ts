import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "safecrib-black": "#0B0C0E",
        "safecrib-green": "#0C7355",
        "safecrib-white": "#FFFFFF",
      },
      fontFamily: {
        display: ["var(--font-manrope)", "Manrope", "Arial", "sans-serif"],
        sans: ["var(--font-dm-sans)", "DM Sans", "Arial", "sans-serif"],
      },
      maxWidth: {
        content: "72rem",
      },
    },
  },
  plugins: [],
};

export default config;
