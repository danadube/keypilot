# Platform page structure contract

Source of truth for major authenticated workspace pages in KeyPilot. Follow this so UI passes do not remove the title and action layer.

## Required order

1. **Global `AppHeader`** — product shell, account, mobile nav (provided by `DashboardShell`).
2. **`PageHeader`** — module or page identity on the left (`title` + `subtitle`); on the right, **`Actions`** (utilities and navigation) and **`Add`** (creation flows). Implemented via `components/layout/PageHeader.tsx` and module-specific wrappers under `components/platform/` (e.g. `TransactionHqPageHeader`, `ClientKeepPageHeader`).
3. **Optional tabs, section tabs, or filters** — must sit **below** `PageHeader`, never replace it.
4. **Main work surface** — lists, tables, detail content, metrics.

## Roles

| Layer | Role |
|--------|------|
| `AppHeader` | Global navigation and account; not the place for module titles or page-level create actions. |
| `PageHeader` | Page/module identity (title + subtitle) and **primary** entry points: **Actions** (menus, links to tools) and **Add** (create flows). |
| Tabs / filters | Secondary navigation or list segmentation; they complement `PageHeader`, they do not substitute for it. |

## Rules

- **Tabs and filters must not replace `PageHeader`.** If a workspace has tabs, the structure is: `PageHeader` → tab rail → body.
- **Workspace chrome** (`*WorkspaceChrome` layouts) should include `PageHeader` **above** tab bars so every route in that module gets the contract by default.
- **Do not rely on the shell-only module strip** (`WorkspaceMainContextBar`) as the only title layer for routes that use in-page `PageHeader`. For those routes, the shell strip is hidden (`hidesWorkspaceMainContextBar` in `lib/shell/hides-workspace-main-context-bar.ts`) to avoid duplicate module titles.
- **Page-level actions** (create record, open tool, manage views) belong in **`PageHeader`**, not only in body cards or context strips.

## Regression prevention

- When adding a new major workspace, either reuse an existing `*PageHeader` wrapper or add one and extend `hidesWorkspaceMainContextBar` if the shell strip would duplicate the new header.
- Prefer shared workspace wrappers over one-off pages that omit `PageHeader`.
