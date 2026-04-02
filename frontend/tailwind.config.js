/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,tsx,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink:        '#2A2A26',
        parchment:  '#F5F0E8',
        cream:      '#EDE7D9',
        linen:      '#D9D0BE',
        acid:       '#7AE23A',
        moss:       '#314E22',
        'rose-dust':'#C97B84',
        sienna:     '#A63B10',
        ochre:      '#C4882A',
        charcoal:   '#2A2A26',
        fog:        '#6F7B65',
        // Stitch system colours
        primary:    '#2e6c00',
        tertiary:   '#a63b10',
        outline:    '#6f7b65',
        error:      '#ba1a1a',
        secondary:  '#486637',
      },
      fontFamily: {
        headline: ['"Playfair Display"', 'serif'],
        body:     ['"DM Sans"', 'sans-serif'],
        label:    ['"IBM Plex Mono"', 'monospace'],
        mono:     ['"IBM Plex Mono"', 'monospace'],
        sans:     ['"DM Sans"', 'sans-serif'],
        serif:    ['"Playfair Display"', 'serif'],
      },
      borderRadius: {
        none:    '0px',
        DEFAULT: '0px',
        sm:      '2px',
        md:      '2px',
        lg:      '0px',
        xl:      '0px',
        full:    '9999px',
      },
      boxShadow: {
        hard:       '3px 3px 0px #D9D0BE',
        'hard-lg':  '5px 5px 0px #C4C0B4',
        'hard-sm':  '2px 2px 0px #D9D0BE',
      },
      keyframes: {
        scan: {
          '0%':   { left: '0' },
          '100%': { left: 'calc(100% - 40px)' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':      { transform: 'scale(1.4)', opacity: '0.6' },
        },
      },
      animation: {
        scan:      'scan 1.5s linear infinite',
        heartbeat: 'heartbeat 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
