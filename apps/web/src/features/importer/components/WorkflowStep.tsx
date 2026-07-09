import type { LucideIcon } from "lucide-react";

interface WorkflowStepProps {
  title: string;
  description: string;
  icon: LucideIcon;
  status: string;
}

export function WorkflowStep({ title, description, icon: Icon, status }: WorkflowStepProps) {
  return (
    <article className="min-h-36 rounded-lg border border-line bg-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-leaf shadow-sm">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-muted">
          {status}
        </span>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-5 text-muted">{description}</p>
    </article>
  );
}
