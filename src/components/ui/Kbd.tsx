export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[20px] items-center justify-center rounded border border-togo-border bg-togo-surface-2 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-togo-muted">
      {children}
    </kbd>
  );
}
