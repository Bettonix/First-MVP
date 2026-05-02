export default function SettingsLoading() {
  return (
    <div className="dash-page p-4 md:p-8 pb-16 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 dash-card rounded-2xl animate-pulse" />
        <div className="space-y-2">
          <div className="h-7 w-44 dash-card rounded-xl animate-pulse" />
          <div className="h-4 w-64 dash-card rounded-lg animate-pulse" />
        </div>
      </div>
      {/* Tabs */}
      <div className="flex gap-2">
        {[80, 100, 60].map((w, i) => (
          <div key={i} className={`h-10 w-${w === 80 ? '20' : w === 100 ? '28' : '16'} dash-card rounded-xl animate-pulse`} />
        ))}
      </div>
      {/* Content cards */}
      <div className="dash-card rounded-3xl p-6 space-y-4">
        <div className="h-6 w-40 dash-card rounded-lg animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 dash-card rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
