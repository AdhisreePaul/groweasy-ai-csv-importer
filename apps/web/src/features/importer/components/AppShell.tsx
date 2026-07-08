import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#0F172A] lg:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 lg:pl-[254px]">{children}</main>
    </div>
  );
}
