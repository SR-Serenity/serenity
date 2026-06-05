# Frontend Style Conventions

This project uses **Tailwind-first styling** with theme tokens defined in `apps/web/src/app/global.css`.

## 1) Use Tailwind first

Use Tailwind utilities for:
- spacing (`p-4`, `gap-2`, `mt-3`)
- layout (`flex`, `grid`, `min-h-0`)
- typography (`text-sm`, `font-medium`)
- radius (`rounded-md`)

Keep raw CSS variables in `global.css` only. Components should consume generated Tailwind token classes.

## 2) Theme token architecture

Define base tokens in `global.css`:
- `.theme-dark` and `.theme-light` hold raw token values (`--theme-*`, `--global-*`, etc.).
- `@theme inline` maps those tokens to Tailwind theme namespaces (`--color-*`, `--radius-*`, `--font-*`).

Examples in `@theme inline`:
- `--color-nav: var(--theme-navpanel-color);`
- `--color-caption: var(--theme-caption-color);`
- `--color-btn-hover: var(--theme-button-hovered);`

This generates IntelliJ-friendly classes like:
- `bg-nav`
- `text-caption`
- `hover:bg-btn-hover`
- `border-divider`

## 3) Component rule: no `var(...)` in class names

In React/TSX components:
- Use semantic Tailwind token classes (`bg-nav`, `text-content`, `border-nav-divider`).
- Do not use `bg-[var(--...)]`, `text-[var(--...)]`, or inline `style={{ color: 'var(--...)' }}` for theme colors.

Allowed exceptions:
- Numeric dynamic sizing where Tailwind cannot express the runtime value.
- Third-party components that require inline style props.

## 4) Units and sizing rules

- Margin/padding/gap: use Tailwind scale (`px-4`, `gap-2`) or `rem`-based tokens in `global.css`.
- Border radius: Tailwind radius utilities (`rounded-md`) backed by `--radius-*`.
- Fixed rails/control heights: use px convention (`h-[36px]`, `w-[280px]`) or mapped tokens.

## 5) Adding or changing colors

When adding a new semantic color:
1. Add/adjust raw values in both `.theme-dark` and `.theme-light`.
2. Expose it in `@theme inline` as a `--color-*` token.
3. Use the generated Tailwind class in components.
4. Prefer semantic names (`--color-nav-hover`) over component-specific names.

## 6) IntelliJ / Tailwind DX

- Keep one valid CSS entry containing `@import "tailwindcss"` (required for Tailwind v4 language server detection).
- Prefer standard token classes over arbitrary values to improve completion, hover previews, and inspections in IntelliJ.
