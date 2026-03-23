/**
 * Tailwind classes for ShowingHQ calendar modals (BrandModal uses kp surfaces;
 * fields portaled outside .kp-dashboard-app need explicit dark-theme text/background).
 */
export const kpCalendarModalField = {
  label: "text-kp-on-surface",
  selectTrigger:
    "h-10 border-kp-outline bg-kp-surface-high text-kp-on-surface shadow-none data-[placeholder]:text-kp-on-surface-variant [&_svg]:text-kp-on-surface-variant focus:ring-1 focus:ring-kp-teal/50",
  selectContent: "border-kp-outline bg-kp-surface-higher text-kp-on-surface",
  selectItem:
    "cursor-pointer text-kp-on-surface focus:bg-kp-teal/20 focus:text-kp-on-surface data-[disabled]:text-kp-on-surface-variant",
  input:
    "h-10 border-kp-outline bg-kp-surface-high text-kp-on-surface shadow-none placeholder:text-kp-on-surface-variant scheme-dark focus-visible:ring-1 focus-visible:ring-kp-teal/50",
  textarea:
    "border-kp-outline bg-kp-surface-high text-kp-on-surface placeholder:text-kp-on-surface-variant focus-visible:ring-1 focus-visible:ring-kp-teal/50",
  mutedHelp: "text-sm text-kp-on-surface-variant",
  error:
    "rounded-md border border-red-500/40 bg-red-950/35 px-3 py-2 text-sm text-red-200",
} as const;
