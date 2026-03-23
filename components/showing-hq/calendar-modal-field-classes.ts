/**
 * Tailwind classes for ShowingHQ calendar modals (BrandModal uses kp surfaces;
 * fields portaled outside .kp-dashboard-app need explicit dark-theme text/background).
 */
export const kpCalendarModalField = {
  /** Primary field labels */
  label: "text-sm font-medium leading-snug text-kp-on-surface",
  /** Section title inside schedule chrome */
  scheduleTitle:
    "mb-3 text-xs font-semibold uppercase tracking-wider text-kp-on-surface/85",
  /** Groups native date/time fields for clearer hierarchy */
  scheduleChrome:
    "rounded-lg border border-kp-outline bg-kp-surface-high p-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
  selectTrigger:
    "h-10 border-kp-outline bg-kp-surface-higher text-kp-on-surface shadow-none data-[placeholder]:text-kp-on-surface/60 [&_svg]:text-kp-on-surface/80 focus:ring-1 focus:ring-kp-teal/50 focus:ring-offset-0",
  selectContent: "border-kp-outline bg-kp-surface-higher text-kp-on-surface",
  selectItem:
    "cursor-pointer text-kp-on-surface focus:bg-kp-teal/20 focus:text-kp-on-surface data-[disabled]:cursor-not-allowed data-[disabled]:text-kp-on-surface/55 data-[disabled]:opacity-90",
  /** Text fields (title, etc.) */
  input:
    "h-10 border-kp-outline bg-kp-surface-higher text-kp-on-surface shadow-none placeholder:text-kp-on-surface/55 scheme-dark focus-visible:ring-1 focus-visible:ring-kp-teal/50 focus-visible:ring-offset-0",
  /** Native date / time inputs — slightly taller, tabular value text */
  inputNativePicker:
    "h-11 min-h-[2.75rem] border-kp-outline bg-kp-surface-higher px-3 py-2 text-sm font-medium tabular-nums tracking-tight text-kp-on-surface shadow-none scheme-dark focus-visible:ring-1 focus-visible:ring-kp-teal/50 focus-visible:ring-offset-0",
  textarea:
    "border-kp-outline bg-kp-surface-higher text-kp-on-surface placeholder:text-kp-on-surface/55 focus-visible:ring-1 focus-visible:ring-kp-teal/50 focus-visible:ring-offset-0",
  mutedHelp: "text-sm text-kp-on-surface/75",
  error:
    "rounded-md border border-red-500/40 bg-red-950/35 px-3 py-2 text-sm text-red-200",
  /** Cancel-style actions in modal footers */
  buttonCancel:
    "border-kp-outline bg-kp-surface-high text-kp-on-surface hover:bg-kp-surface-higher hover:text-kp-on-surface",
  /** Primary save in modal footers */
  buttonSave:
    "bg-kp-gold font-semibold text-kp-bg shadow-none hover:bg-kp-gold-bright",
} as const;
