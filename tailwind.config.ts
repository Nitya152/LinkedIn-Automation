import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        linkedin: {
          50: "#e8f4f9",
          100: "#cbe4f1",
          500: "#0a66c2",
          600: "#004182",
          700: "#083366",
        },
      },
    },
  },
  plugins: [],
};

export default config;

