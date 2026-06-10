import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "../ui/utils";
import { Toaster } from "../ui/sonner";

interface AdminLayoutProps {
  currentPage: string;
  onNavigate: (page: any) => void;
  children: React.ReactNode;
}

export function AdminLayout({ currentPage, onNavigate, children }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Sidebar
        currentPage={currentPage as any}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <Topbar
        currentPage={currentPage}
        sidebarCollapsed={sidebarCollapsed}
        onNavigate={onNavigate}
      />
      <main
        className={cn(
          "pt-14 min-h-screen transition-all duration-300",
          sidebarCollapsed ? "md:ml-16" : "md:ml-60"
        )}
      >
        <div className="p-4 sm:p-5 lg:p-6">
          {children}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}
