import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        void: '#03070f',
        deep: '#060d1a',
        surface: '#0a1628',
        card: '#0d1c35',
        raised: '#102040',
        solar: {
          cyan: '#00d4ff',
          amber: '#ffb020',
          red: '#ff4060',
          green: '#00e5a0',
          violet: '#a78bfa',
        },
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.4)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease forwards',
      },
    },
  },
  plugins: [],
}

export default config
