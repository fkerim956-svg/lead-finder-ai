import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-screen text-[#1E293B]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar />
        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}
