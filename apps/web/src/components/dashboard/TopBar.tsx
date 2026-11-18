import { Menu, Plus, Search, X } from "lucide-react";

interface TopBarProps {
  breadcrumb: string[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenNewUpload: () => void;
  onOpenMobileMenu: () => void;
}

export function TopBar({
  breadcrumb,
  searchQuery,
  onSearchChange,
  onOpenNewUpload,
  onOpenMobileMenu,
}: TopBarProps) {
  return (
    <header className="md:sticky md:top-0 z-30 bg-brand-light/85 backdrop-blur-md border-b border-brand-card/90 px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-2.5 sm:gap-6">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 md:flex-initial">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Abrir navegación"
            className="lg:hidden flex h-11 w-11 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-brand-card bg-white text-brand-dark hover:border-brand-accent hover:text-brand-primary transition-all duration-150 active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>

          <nav
            aria-label="Ruta de navegación"
            className="flex items-center gap-2 text-[14px] min-w-0 overflow-hidden"
          >
            {breadcrumb.map((segment, index) => {
              const isLast = index === breadcrumb.length - 1;
              return (
                <span key={`${segment}-${index}`} className="flex items-center gap-2 min-w-0">
                  {index > 0 && (
                    <span
                      className="hidden sm:inline text-brand-accent font-semibold shrink-0"
                      aria-hidden="true"
                    >
                      /
                    </span>
                  )}
                  <span
                    className={`truncate ${
                      isLast
                        ? "font-semibold text-brand-dark"
                        : "hidden sm:inline font-medium text-brand-dark/65"
                    }`}
                  >
                    {segment}
                  </span>
                </span>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-primary" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar resúmenes, temas o archivos..."
              aria-label="Buscar documentos"
              className="h-[42px] w-full rounded-xl bg-white border border-brand-card pl-10 pr-9 text-[14px] text-brand-dark placeholder:text-brand-accent transition-all duration-150 focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(127,196,242,0.28)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-brand-dark/60 hover:bg-brand-light hover:text-brand-dark transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenNewUpload}
            className="inline-flex h-11 sm:h-[42px] items-center gap-2 rounded-xl bg-brand-primary px-3.5 sm:px-4 text-[14px] font-semibold text-white shadow-sm shadow-brand-primary/25 transition-all duration-200 hover:bg-brand-dark hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Resumir</span>
          </button>
        </div>
      </div>

      {/* Buscador móvil */}
      <div className="mt-3 md:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-primary" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar resúmenes, temas o archivos..."
            aria-label="Buscar documentos"
            className="h-11 w-full rounded-xl bg-white border border-brand-card pl-10 pr-9 text-[14px] text-brand-dark placeholder:text-brand-accent transition-all duration-150 focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(127,196,242,0.28)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-brand-dark/60 hover:bg-brand-light hover:text-brand-dark"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}