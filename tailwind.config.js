/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#1a1a1a',
        bubble: 'rgba(255,255,255,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'pulse-mic': 'pulseMic 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseMic: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.4)' },
          '50%': { boxShadow: '0 0 0 16px rgba(239,68,68,0)' },
        },
      },
    },
  },
  plugins: [],
};
