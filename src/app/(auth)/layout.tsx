import { Logo } from "@/components/shared/logo";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-secondary px-5 py-12">
      <Logo variant="full" />
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">{children}</div>
    </main>
  );
}
