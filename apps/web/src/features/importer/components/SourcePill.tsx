interface SourcePillProps {
  source: string;
}

export function SourcePill({ source }: SourcePillProps) {
  return (
    <span className="rounded-full border border-line bg-soft px-3 py-1 text-xs font-medium text-muted">
      {source}
    </span>
  );
}
