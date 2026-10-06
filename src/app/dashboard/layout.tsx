import { requireAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/mobile/bottom-nav";
import { MobileFAB } from "@/components/mobile/mobile-fab";
import { OfflineIndicator } from "@/components/mobile/offline-indicator";
import { FloatingAIAssistant } from "@/components/ai/floating-ai-assistant";
import { SidebarProvider } from "@/components/layout/sidebar-context";

import { PageTransition } from "@/components/layout/page-transition";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAuth();
  } catch (error) {
    console.warn("Dashboard layout auth check warning:", error);
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden transition-all duration-300">
          <OfflineIndicator />
          <Header />
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
          <FloatingAIAssistant />
          <MobileFAB />
          <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
