# Supra UI Rules

## 1. Button Contrast Rules

All buttons must remain readable at rest and on hover.

Rules:
- Hover must never reduce text contrast
- Hover must never make text blend into the background
- Primary buttons must keep strong contrast on hover
- Secondary buttons must keep full readable text on hover
- Tertiary buttons must remain readable and clearly clickable
- Disabled is the only state allowed to look muted

If a hover state makes a button harder to read, it is a bug.

---

## 2. Button Tier System

Use the shared Supra button tiers from:

`components/modules/showing-hq/supra-inbox-button-tiers.ts`

Available tiers:
- `supraBtnPrimary`
- `supraBtnSecondary`
- `supraBtnTertiary`
- `supraBtnSave`
- `supraBtnDangerSecondary`

Rules:
- Do not invent one-off button styles when an existing tier fits
- Do not rely on default shadcn outline/ghost hover text colors without explicitly overriding them
- If using `variant="outline"` or `variant="ghost"`, ensure hover text is explicitly set in the tier classes

---

## 3. Shadcn Hover Conflict Rule

`Button` variants like `outline` and `ghost` include default:
- `hover:bg-accent`
- `hover:text-accent-foreground`

These can override intended Supra colors on dark surfaces.

Rules:
- Every Supra button tier must explicitly set its hover text color
- Primary must include `hover:text-kp-bg`
- Secondary must include `hover:text-kp-on-surface`
- Save must include `hover:text-kp-bg`
- Danger-secondary must include an explicit readable hover text color
- Tertiary must include `hover:text-kp-on-surface`

If hover text is not explicitly set, assume it is unsafe.

---

## 4. No Opacity Stacking on Interactive Text

Rules:
- Avoid text opacity below `/70` for interactive elements
- Do not stack multiple low-opacity text layers on controls
- Labels may be softer, but buttons and pills must remain high contrast
- Buttons should use full readable contrast, not muted text

---

## 5. Interactive Elements Must Look Clickable

Rules:
- Buttons must have either:
  - strong fill
  - or strong border + clear contrast
- Inactive is not the same as disabled
- Hover should reinforce clickability, not flatten it
- Ghost-like clickable elements that resemble disabled controls are not acceptable

---

## 6. Filter Pills

Rules:
- Active pills must be clearly filled and selected
- Inactive pills must still look selectable
- Count badges must remain readable at rest and on hover
- Active special states (gold/red) must also explicitly set hover text color

---

## 7. Apply vs Review Hierarchy

Rules:
- Apply = primary
- Review = secondary
- Both must always be readable without hover
- Hover must not reduce either button’s legibility

---

## 8. Save Hierarchy

Rules:
- Save actions use the save tier (`supraBtnSave`)
- Save must visually stand apart from ordinary secondary actions
- Save must never look disabled or low-priority

---

## 9. Validation Rule

Before merging any Supra UI work:
- check buttons at rest
- check buttons on hover
- check buttons when disabled
- check active and inactive filter pills

If any clickable control becomes harder to read on hover, the work is not done.

---

## 10. Scope

These rules apply to:
- Supra Inbox
- Supra review modal
- Open-house sign-in flows
- Future ShowingHQ surfaces using the same dark UI patterns
