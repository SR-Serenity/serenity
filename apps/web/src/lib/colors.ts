/**
 * Brand color tokens — single source of truth is global.css (:root --brand-*)
 *
 * Use Tailwind utilities in JSX:  bg-brand, text-brand, border-brand-border, etc.
 * Use these constants only when you need a raw hex value (e.g. SVG fill, canvas).
 *
 * To retheme: change the CSS variables in global.css, not here.
 */
export const colors = {
  brand:        '#070738',
  brandHover:   '#0d0d5c',
  brandLight:   '#ededf8',
  brandSurface: '#f8f8fc',
  brandMuted:   '#6b7080',
  brandBorder:  '#e2e2ee',
} as const

export type ColorKey = keyof typeof colors
