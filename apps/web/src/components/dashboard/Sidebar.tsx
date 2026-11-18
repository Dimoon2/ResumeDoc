import { FileText, FolderOpen, LogOut, Users, X } from "lucide-react";
import type { ActiveNavSection, User } from "../../types/summary";

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
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-lg"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white shrink-0">
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
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-brand-dark hover:bg-brand-light transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Navegación principal" className="space-y-1.5">
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.04em] text-brand-dark/65">
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[14px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${
                  isActive
                    ? "bg-brand-primary text-white"
                    : "text-brand-dark hover:bg-brand-light hover:text-brand-primary"
                }`}
              >
                <span className="flex items-center gap-3 whitespace-nowrap shrink-0">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                <span
                  className={`text-[12px] font-semibold tabular-nums ${
                    isActive ? "text-white/90" : "text-brand-dark/70"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-brand-card bg-brand-light">
        <div className="flex items-center justify-between gap-2 px-1 py-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-card text-[12px] font-bold text-brand-dark">
              {currentUser.initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-brand-dark">
                {currentUser.name}
              </p>
              <p className="truncate text-[11px] text-brand-dark/70">
                {currentUser.email || currentUser.role}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-dark/75 hover:bg-white hover:text-brand-primary transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
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
            className="fixed inset-0 bg-brand-dark/25 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[280px] max-w-[85vw] h-full shadow-azure-active">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}