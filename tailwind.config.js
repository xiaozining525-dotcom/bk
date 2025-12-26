import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        glass: "var(--glass-bg)",
        glassBorder: "var(--glass-border)",
        glassDark: "rgba(2, 6, 23, 0.8)", 
      },
      backdropBlur: {
        xs: '2px',
      },
      // 自定义排版样式，使其在磨砂玻璃背景上更清晰
      typography: (theme) => ({
        DEFAULT: {
          css: {
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            maxWidth: 'none', // 取消最大宽度限制，利用容器宽度
            color: theme('colors.slate.700'),
            a: {
              color: theme('colors.blue.600'),
              '&:hover': {
                color: theme('colors.blue.700'),
              },
            },
            h1: { color: theme('colors.slate.900') },
            h2: { color: theme('colors.slate.800') },
            h3: { color: theme('colors.slate.800') },
            strong: { color: theme('colors.slate.800') },
            code: {
              color: theme('colors.pink.600'),
              backgroundColor: theme('colors.slate.100'),
              padding: '2px 4px',
              borderRadius: '4px',
              fontWeight: '500',
            },
            blockquote: {
              borderLeftColor: theme('colors.blue.500'),
              backgroundColor: 'rgba(255,255,255,0.3)',
              padding: '0.5rem 1rem',
              fontStyle: 'italic',
              borderRadius: '0.5rem',
            },
          },
        },
        invert: {
          css: {
            color: theme('colors.slate.300'),
            a: {
              color: theme('colors.blue.400'),
              '&:hover': {
                color: theme('colors.blue.300'),
              },
            },
            h1: { color: theme('colors.white') },
            h2: { color: theme('colors.slate.100') },
            h3: { color: theme('colors.slate.200') },
            strong: { color: theme('colors.white') },
            code: {
              color: theme('colors.pink.400'),
              backgroundColor: 'rgba(255,255,255,0.1)',
            },
            blockquote: {
              borderLeftColor: theme('colors.blue.400'),
              backgroundColor: 'rgba(0,0,0,0.2)',
              color: theme('colors.slate.300'),
            },
          },
        },
      }),
    },
  },
  plugins: [
    typography,
  ],
}