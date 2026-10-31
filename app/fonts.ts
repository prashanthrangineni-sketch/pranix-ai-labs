// Fonts are served from the site itself (installed npm packages), not downloaded
// from Google at build time. Google Fonts downloads intermittently failed during
// builds ("An error occurred in next/font ... Cannot read properties of null"),
// which failed preview and production deploys for reasons unrelated to the code.
// next/font requires every value below to be a literal written in place.
import localFont from 'next/font/local'

// Founder dashboard + root layout
export const inter = localFont({ src: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', weight: '100 900', variable: '--font-inter', display: 'swap' })
export const jetbrainsMono = localFont({ src: '../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2', weight: '100 800', variable: '--font-jetbrains', display: 'swap' })

// Public site
export const fontD = localFont({ src: '../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2', weight: '300 700', variable: '--px-font-d', display: 'swap' })
export const fontB = localFont({ src: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', weight: '100 900', variable: '--px-font-b', display: 'swap' })
export const fontM = localFont({ src: '../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2', weight: '100 800', variable: '--px-font-m', display: 'swap' })
