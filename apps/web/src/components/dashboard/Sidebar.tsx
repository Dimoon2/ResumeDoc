import { FileText, FolderOpen, LogOut, Users, X } from "lucide-react";
import type { ActiveNavSection, User } from "../../types/summary";
import { OctyMascot } from "../ui/OctyMascot";

interface SidebarProps {
  activeNav: ActiveNavSection;
  onSelectNav: (nav: ActiveNavSection) => void;
  currentUser: User;
  myDocsCount: number;
  sharedUsersCount: number;
  totalDocsCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export function Sidebar({
  activeNav,
  onSelectNav,
  currentUser,
  myDocsCount,
  sharedUsersCount,
  totalDocsCount,
  mobileOpen,
  onCloseMobile,
  onLogout,
}: SidebarProps) {
  const navItems: Array<{
    id: ActiveNavSection;
    label: string;
    count: number;
    icon: typeof FileText;
  }> = [
    { id: "my-summaries", label: "Mis Resúmenes", count: myDocsCount, icon: FileText },
    { id: "shared", label: "Compartidos", count: sharedUsersCount, icon: Users },
    { id: "library", label: "Biblioteca", count: totalDocsCount, icon: FolderOpen },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-brand-card">
      <div className="p-6 space-y-8 overflow-y-auto">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onSelectNav("my-summaries");
              onCloseMobile();
            }}
            className="group flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-lg"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary text-white shadow-sm shadow-brand-primary/30 transition-transform duration-200 group-hover:scale-105 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <span className="font-display text-[19px] font-extrabold tracking-[-0.03em] text-brand-dark whitespace-nowrap">
              Resume<span className="text-brand-primary">Doc</span>
            </span>
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Cerrar menú lateral"
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-brand-dark hover:bg-brand-light transition-colors active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Navegación principal" className="space-y-1.5">
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.04em] text-brand-dark/60 uppercase">
            Espacio de trabajo
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectNav(item.id);
                  onCloseMobile();
                }}
                className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${
                  isActive
                    ? "bg-brand-primary text-white shadow-sm shadow-brand-primary/25"
                    : "text-brand-dark hover:bg-brand-light hover:text-brand-primary"
                }`}
              >
                <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                      isActive ? "" : "group-hover:scale-110"
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums transition-colors ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-brand-light text-brand-dark/75 group-hover:bg-brand-card/60"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="shrink-0">
        <div className="px-4 pb-3">
          <div className="rounded-2xl bg-brand-light border border-brand-card p-3 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-brand-card shadow-sm">
              <OctyMascot pose="neutral" size={38} />
            </div>
            <div className="min-w-0">
              <p className="font-display text-[13px] font-bold text-brand-dark leading-tight">
                Octy
              </p>
              <p className="text-[11px] leading-[15px] text-brand-dark/70 mt-0.5">
                Asistente de resúmenes
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-brand-card bg-brand-light/70">
          <div className="rounded-xl bg-white border border-brand-card/80 p-2.5 flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-card text-[12px] font-bold text-brand-dark">
                {currentUser.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-brand-dark">
                  {currentUser.name}
                </p>
                <p className="truncate text-[11px] text-brand-dark/65">
                  {currentUser.email || currentUser.role}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-dark/70 hover:bg-brand-light hover:text-brand-primary transition-all duration-150 active:scale-95"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[260px] shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="animate-backdrop-in fixed inset-0 bg-brand-dark/25 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="animate-drawer-in relative z-10 w-[280px] max-w-[85vw] h-full shadow-azure-active">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}