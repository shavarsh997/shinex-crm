export default function DashboardLoading() {
  return <div className="mx-auto max-w-6xl p-5 sm:p-8"><div className="h-7 w-32 animate-pulse rounded bg-muted" /><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-52 animate-pulse rounded-xl bg-muted" />)}</div></div>;
}
