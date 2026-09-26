export function FeaturePlaceholder({ name }: { name: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed">
      <p className="text-sm text-stone-500">{name} — coming in a later milestone</p>
    </div>
  );
}
