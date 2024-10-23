module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        'snout-base': '#3c424a',
        'snout-deep': '#343a40',
        'snout-light': '#ffffff',
        'snout-bright': '#d9d9d9',
        'snout-deep-dark': '#272c30',
        'gradient-start': '#5733FF',
        'gradient-middle': '#338957',
        'gradient-end': '#5733FF',
      },
      animation: {
        gradientShift: 'gradientShift 5s ease-in-out infinite',
      },
      keyframes: {
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      backgroundSize: {
        '400%': '400% 400%',
      },
    },
  },
  plugins: [],
};