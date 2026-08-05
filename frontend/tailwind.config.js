/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ---- ParkSlot token system ----
        // Grounded in real parking infrastructure: sensor lights, meters,
        // cones, and lot-marking chalk — not a generic SaaS palette.
        asphalt: {
          DEFAULT: '#14181F', // near-black charcoal-navy, main dark surface
          800: '#1C222C',
          700: '#262E3B',
        },
        chalk: '#F4F6F2',      // lot-line white, light surface
        signal: {
          DEFAULT: '#0E9A8C', // "available" sensor teal — primary brand
          light: '#5FCBBE',
          dark: '#0A6F65',
        },
        meter: {
          DEFAULT: '#F2A93B', // meter amber — pricing / secondary accent
          light: '#FBCE83',
        },
        cone: {
          DEFAULT: '#FF5F45', // traffic-cone coral — alerts / occupied
          dark: '#D8442C',
        },
        ink: '#1C2333',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        lift: '0 20px 45px -20px rgba(14, 24, 31, 0.45)',
      },
      backgroundImage: {
        'lane-lines': 'repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(244,246,242,0.35) 18px, rgba(244,246,242,0.35) 34px)',
      },
    },
  },
  plugins: [],
};
