export default function AppLoading() {
  return (
    <div className="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-3 p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e8e8e8] border-t-primary" />
      <p className="text-sm text-[#8c8c8c]">Opening…</p>
      <div className="mt-4 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-xl bg-[#ebebeb] dark:bg-neutral-800"
          />
        ))}
      </div>
    </div>
  );
}
