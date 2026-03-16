## KeyPilot Token Architecture

### Brand source of truth

- **Primary navy**: `#1A3672`
- **Secondary sky**: `#4BAED8`
- **Sidebar background**: `#0B1A3C`
- **Main canvas**: `#F8FAFC`
- **Surface (cards)**: `#FFFFFF`
- **Surface alt**: `#EDF2F8`
- **Border**: `#D3E2F0`
- **Text**: `#0F172A`
- **Muted text**: `#64748B`

These values live in `design-system/brands/keypilot.ts` and are mapped to CSS variables by `design-system/css-vars.ts` and applied via `BrandProvider` (`design-system/brand-context.tsx`).

### Token roles

- **App canvas**
  - Token: `--brand-bg`
  - Source: `keypilotTheme.colors.background` (`#F8FAFC`)
  - Usage: Top-level dashboard/content background (`DashboardShell` main flex container).

- **Cards / primary surfaces**
  - Token: `--brand-surface`
  - Source: `keypilotTheme.colors.surface` (`#FFFFFF`)
  - Usage: Cards, panels, primary content surfaces (e.g. `Card`, ShowingHQ hero surface, detail views).

- **Alternate surface**
  - Token: `--brand-surface-alt`
  - Source: `keypilotTheme.colors.surfaceAlt` (`#EDF2F8`)
  - Usage: Light navy-tinted background for inline highlights and supporting bands inside cards (never the full app shell).

- **Sidebar rail**
  - Token: `--brand-sidebar-bg`
  - Source: `keypilotTheme.colors.sidebarBg` (`#0B1A3C`)
  - Usage: Main left navigation rail and the aligned header brand strip.

- **Hero**
  - Background: `--brand-surface` (white)
  - Accent ring: `--kp-hero-ring` (currently `#4BAED8`)
  - Structural accent: `--brand-primary` on the left border
  - Usage: ShowingHQ hero / module banner. Any future heroes should follow the same pattern (white surface + primary/secondary accents), not ad hoc tinted backgrounds.

- **Borders**
  - Token: `--brand-border`
  - Source: `keypilotTheme.colors.border` (`#D3E2F0`)
  - Usage: Shell dividers (header, sidebar), card borders, table outlines.

- **Interaction**
  - Primary: `--brand-primary` (`#1A3672`)
  - Secondary: `--brand-secondary` (`#4BAED8`)
  - Usage:
    - Structure-level emphasis (hero accent, primary CTAs): `--brand-primary`
    - Interactive highlights (active nav items, links, chips): `--brand-secondary`

- **Text**
  - Primary text: `--brand-text` (`#0F172A`)
  - Muted/supporting: `--brand-text-muted` (`#64748B`)
  - Usage: All structural labels and body copy should use these tokens (or Tailwind utilities mapped to them), not arbitrary slate shades.

### Rules

- **Navy for structure**
  - Use `--brand-primary` and `--brand-sidebar-bg` for structural elements: sidebar rail, hero accent border, key dividers.

- **Sky for interaction**
  - Use `--brand-secondary` for active/hover states, pills, and interactive highlights (e.g. sidebar active link, hero ring).

- **White for cards**
  - Card-like surfaces should default to `--brand-surface` (white) with `--brand-border` and restrained shadows.

- **Gradients**
  - Gradients are only allowed in:
    - Hero/cover contexts explicitly designed to use them.
  - The default app shell (canvas, sidebar, header) should avoid decorative gradients unless documented.

- **Structural colors must be token-driven**
  - Do **not** use raw Tailwind structural colors (`bg-sky-*`, `bg-slate-*`, `bg-zinc-*`, `bg-purple-*`, `bg-violet-*`, `bg-pink-*`) for:
    - App canvas
    - Sidebar
    - Header strips
    - Hero shells
  - These surfaces must use `--brand-*` or documented semantic tokens.

- **Micro accents**
  - Badge/icon/metric accent colors may use Tailwind utilities if needed for legibility, but:
    - They should not redefine the app shell or large layout surfaces.
    - When in doubt, prefer `--brand-primary` / `--brand-secondary`.

### Allowed structural tokens

- `--brand-bg`: app canvas / main dashboard background
- `--brand-surface`: card and primary content surfaces
- `--brand-surface-alt`: subtle inline highlight surfaces, never full shell background
- `--brand-border`: all structural and card borders
- `--brand-sidebar-bg`: left sidebar / navigation rail background
- `--brand-primary`: primary navy for structural accents and key CTAs
- `--brand-secondary`: sky for interactive states and highlights
- `--kp-hero-ring`: hero ring/accent color (`#4BAED8`)

### Usage guidelines

- **App shell**
  - Canvas: `bg-[var(--brand-bg)]`
  - Sidebar: `bg-[var(--brand-sidebar-bg)]`
  - Header strip: `bg-[var(--brand-surface)]` (except the left brand column, which aligns with the sidebar background)

- **Hero**
  - Background: `bg-[var(--brand-surface)]`
  - Left accent: inline style `borderLeftColor: "var(--brand-primary)"`
  - Ring: `ring-[var(--kp-hero-ring)]`

- **Cards and panels**
  - Default: `bg-[var(--brand-surface)] border-[var(--brand-border)]`
  - Optional highlight sections: `bg-[var(--brand-surface-alt)]` inside a card.

- **Navigation**
  - Sidebar background: `--brand-sidebar-bg`
  - Active item: `bg-[var(--brand-secondary)]/10 text-[var(--brand-secondary)] border-l-[var(--brand-secondary)]`

