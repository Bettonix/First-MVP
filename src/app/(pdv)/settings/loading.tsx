export default function SettingsLoading() {
  return (
    <div className="dash-page min-h-screen">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 dash-card rounded-2xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-36 dash-card rounded-xl animate-pulse" />
            <div className="h-3 w-64 dash-card rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-16 flex flex-col lg:flex-row gap-6">
        {/* Sidebar skeleton */}
        <aside className="lg:w-52 lg:shrink-0">
          {/* Mobile tabs */}
          <div className="flex lg:hidden gap-2">
            <div className="h-10 w-24 dash-card rounded-xl animate-pulse" />
            <div className="h-10 w-36 dash-card rounded-xl animate-pulse" />
            <div className="h-10 w-16 dash-card rounded-xl animate-pulse" />
          </div>
          {/* Desktop sidebar */}
          <div className="hidden lg:flex flex-col gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 dash-card rounded-xl animate-pulse" />
            ))}
          </div>
        </aside>

        {/* Content skeleton */}
        <main className="flex-1 min-w-0 pt-4 lg:pt-0 space-y-4">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 dash-card rounded-2xl animate-pulse" />)}
          </div>
          {/* Toolbar */}
          <div className="h-10 dash-card rounded-xl animate-pulse" />
          {/* Table */}
          <div className="dash-card rounded-2xl overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[60px] border-b dash-border animate-pulse last:border-0" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
