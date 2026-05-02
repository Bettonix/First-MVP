export default function MesasLoading() {
  return (
    <div className="dash-page p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 dash-card rounded-2xl animate-pulse" />
        <div className="space-y-2">
          <div className="h-7 w-44 dash-card rounded-xl animate-pulse" />
          <div className="h-4 w-64 dash-card rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="dash-card rounded-3xl h-40 animate-pulse" />
      <div className="dash-card rounded-3xl p-6">
        <div className="h-6 w-40 dash-card rounded-lg animate-pulse mb-5" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-24 dash-card rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
