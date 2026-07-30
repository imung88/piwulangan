export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true">
      <div className="h-8 w-64 bg-metro-border" />
      <div className="h-5 w-40 bg-metro-border" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-32 bg-metro-border" />
        <div className="h-32 bg-metro-border" />
      </div>
      <div className="space-y-2">
        <div className="h-16 bg-metro-border" />
        <div className="h-16 bg-metro-border" />
        <div className="h-16 bg-metro-border" />
      </div>
    </div>
  );
}
