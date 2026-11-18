import type { ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { ActiveNavSection, User } from "../../types/summary";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface DashboardLayoutProps {
  activeNav: ActiveNavSection;
  onSelectNav: (nav: ActiveNavSection) => void;
  currentUser: User;
  myDocsCount: number;
  sharedUsersCount: number;
  totalDocsCount: number;
  breadcrumb: string[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenNewUpload: () => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onOpenMobile: () => void;
  onCloseMobile: () => void;
  toastMessage: string | null;
  onDismissToast: () => void;
  children: ReactNode;
}

export function DashboardLayout({
  activeNav,
  onSelectNav,
  currentUser,
  myDocsCount,
  sharedUsersCount,
  totalDocsCount,
  breadcrumb,
  searchQuery,
  onSearchChange,
  onOpenNewUpload,
  onLogout,
  mobileOpen,
  onOpenMobile,
  onCloseMobile,
  toastMessage,
  onDismissToast,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex bg-brand-light text-brand-dark font-sans overflow-x-hidden">
      <Sidebar
        activeNav={activeNav}
        onSelectNav={onSelectNav}
        currentUser={currentUser}
        myDocsCount={myDocsCount}
        sharedUsersCount={sharedUsersCount}
        totalDocsCount={totalDocsCount}
        mobileOpen={mobileOpen}
        onCloseMobile={onCloseMobile}
        onLogout={onLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col bg-[radial-gradient(circle_at_top_right,rgba(127,196,242,0.22),transparent_48%)] bg-brand-light text-brand-dark">
        <TopBar
          breadcrumb={breadcrumb}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onOpenNewUpload={onOpenNewUpload}
          onOpenMobileMenu={onOpenMobile}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
          <div className="max-w-[1200px] mx-auto space-y-6">
            {toastMessage && (
              <div
                role="status"
                className="animate-toast-in rounded-xl bg-white/95 backdrop-blur-sm border border-brand-primary px-4 py-3 flex items-center justify-between gap-3 shadow-azure-floating"
              >
                <div className="flex items-center gap-2.5 text-[13px] sm:text-[14px] font-semibold text-brand-dark min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span className="break-words">{toastMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={onDismissToast}
                  aria-label="Cerrar notificación"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-dark/70 hover:bg-brand-light hover:text-brand-dark transition-colors active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}