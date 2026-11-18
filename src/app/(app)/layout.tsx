import { TopBar } from "@/components/app/top-bar";
import { requireSession } from "@/server/auth/session";

// Alles hier leest live uit de database en hangt aan de sessie: nooit vooraf renderen.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireSession();
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto w-full max-w-[1180px] px-5 pb-20 pt-8 md:px-8 md:pt-12">{children}</main>
    </div>
  );
}
