// components/ui/EmptyState.tsx
export default function EmptyState({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
      <div className="text-6xl text-[var(--text-muted)]">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-[var(--text-muted)]">{description}</p>
    </div>
  );
}
