<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

---

# Project: Serenity

Multi-tenant workspace platform (Slack-like). Nx monorepo with pnpm workspaces.

## Apps

| App | Port | Description |
|-----|------|-------------|
| `apps/web` (`@org/web`) | 9999 | Next.js 16 frontend |
| `apps/gateway` | — | API gateway |
| `apps/auth-service` | — | Auth (login, register, JWT) |
| `apps/core-service` | 2993 | Main REST API |
| `apps/realtime-service` | — | WebSocket |

Run web dev server: `pnpm nx dev @org/web` (port 9999)

## Dependency management — IMPORTANT

**Always add packages from the monorepo root**, never from inside an app folder.

```bash
# correct
cd /home/huy-ph/Documents/DATN/serenity
pnpm add <pkg> --filter @org/web

# wrong — creates a local node_modules inside the app
cd apps/web && pnpm add <pkg>
```

All `node_modules` live at the root. There must be no `node_modules` inside individual apps.

## apps/web stack

- **Next.js 16** App Router, React 19
- **Tailwind CSS v4** — use `@import "tailwindcss"` in CSS (not `@tailwind` directives)
- **PostCSS** — uses `@tailwindcss/postcss` plugin (not `tailwindcss` directly)
- **shadcn/ui** — style: `base-nova`, components in `src/components/ui/`, requires `@base-ui/react`
- **next-intl** — i18n with `en` / `vi` locales

## apps/web color system

Brand color is `#070738` (deep navy). **Do not hardcode hex values in components.**

**Single source of truth:** CSS variables in `src/app/global.css` `:root` block.

| CSS variable | Purpose |
|---|---|
| `--brand` | Primary brand color (#070738) |
| `--brand-hover` | Hover state (slightly lighter) |
| `--brand-light` | Light tint for backgrounds |
| `--brand-surface` | Page/panel background |
| `--brand-muted` | Secondary/muted text |
| `--brand-border` | Subtle borders |

These are registered in `@theme inline` so Tailwind generates utility classes:
`bg-brand`, `text-brand`, `border-brand-border`, `text-brand-muted`, etc.

Use `src/lib/colors.ts` **only** for raw hex values needed in SVG fills or canvas — not in JSX classNames.

To retheme: change the CSS variables in `global.css`, everything updates automatically.

## apps/web key paths

```
src/
  app/
    (auth)/          # login, register — public routes, split-panel layout
    (workspace)/     # [orgSlug] — protected, requires auth cookie
  components/
    auth/            # LoginForm, RegisterForm (4-step), OrgPicker
    ui/              # shadcn components (Button, Input, Label, Card, Badge, Progress…)
  hooks/
    use-auth.tsx     # AuthProvider + useAuth() — auth state, login/register/logout
  lib/
    utils.ts         # cn(), slugify()
    colors.ts        # raw hex constants (for SVG/canvas only)
  middleware.ts      # route protection via auth_token cookie
libs/
  api/src/           # authApi (login, register, switchOrg), request() client, types
  ui/src/            # legacy custom Button/Input/Spinner — prefer src/components/ui/ for new work
```

## apps/web routing

| URL | Page | Auth |
|-----|------|------|
| `/login` | Login + org picker | Public |
| `/register` | 4-step onboarding | Public |
| `/[orgSlug]` | Workspace dashboard | Protected |

Middleware reads `auth_token` + `auth_org_slug` cookies.
