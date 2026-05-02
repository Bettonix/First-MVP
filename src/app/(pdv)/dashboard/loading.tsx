export default function DashboardLoading() {
  return (
    <div className="dash-page p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-16">
      <div className="h-10 w-48 dash-card rounded-xl animate-pulse mb-2" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => <div key={i} className="dash-card rounded-3xl h-32 animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 dash-card rounded-3xl h-80 animate-pulse" />
        <div className="dash-card rounded-3xl h-80 animate-pulse" />
      </div>
      <div className="dash-card rounded-3xl h-96 animate-pulse" />
    </div>
  );
}
