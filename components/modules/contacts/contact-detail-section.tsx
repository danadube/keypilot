import { cn } from "@/lib/utils";

type ContactDetailSectionProps = {
  id?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function ContactDetailSection({
  id,
  title,
  description,
  icon,
  className,
  children,
}: ContactDetailSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-xl border border-kp-outline bg-kp-surface p-5",
        className
      )}
    >
      <div className="mb-4 flex items-start gap-2">
        {icon ? (
          <span className="mt-0.5 text-kp-on-surface-variant">{icon}</span>
        ) : null}
        <div>
          <h2 className="text-sm font-semibold text-kp-on-surface">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
