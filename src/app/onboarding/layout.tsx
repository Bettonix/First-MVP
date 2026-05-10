export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "var(--parchment)" }}>
      {children}
    </div>
  );
}
