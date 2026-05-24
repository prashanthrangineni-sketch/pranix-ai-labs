import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'hsl(var(--bg-canvas))',
        surface: 'hsl(var(--bg-surface))',
        elevated: 'hsl(var(--bg-elevated))',
        border: {
          subtle: 'hsl(var(--border-subtle))',
          strong: 'hsl(var(--border-strong))',
          focus: 'hsl(var(--border-focus))',
        },
        fg: {
          primary: 'hsl(var(--fg-primary))',
          secondary: 'hsl(var(--fg-secondary))',
          muted: 'hsl(var(--fg-muted))',
          disabled: 'hsl(var(--fg-disabled))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent-default))',
          hover: 'hsl(var(--accent-hover))',
          active: 'hsl(var(--accent-active))',
          subtle: 'hsl(var(--accent-subtle))',
        },
        severity: {
          critical: 'hsl(var(--severity-critical))',
          error: 'hsl(var(--severity-error))',
          warn: 'hsl(var(--severity-warn))',
          info: 'hsl(var(--severity-info))',
          success: 'hsl(var(--severity-success))',
          dead: 'hsl(var(--severity-dead))',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['0.6875rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.0625rem', { lineHeight: '1.625rem' }],
        xl: ['1.375rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.75rem', { lineHeight: '2.25rem' }],
        '3xl': ['2.25rem', { lineHeight: '2.75rem' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '14': '56px',
      },
      transitionDuration: {
        instant: '0ms',
        fast: '120ms',
        normal: '200ms',
        slow: '320ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        emphasized: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
        decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
}

export default config
