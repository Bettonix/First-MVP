export default function ComandasLoading() {
  return (
    <div className="dash-page p-4 md:p-8 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 dash-card rounded-2xl animate-pulse" />
        <div className="space-y-2">
          <div className="h-7 w-36 dash-card rounded-xl animate-pulse" />
          <div className="h-4 w-56 dash-card rounded-lg animate-pulse" />
        </div>
      </div>
      {/* Grid de mesas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-36 dash-card rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
