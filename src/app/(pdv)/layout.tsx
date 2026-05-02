import { AppSidebar } from "@/components/AppSidebar";

export default function PdvLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#0B0D11]">
      <AppSidebar />
      <main className="flex-1 min-h-0 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
