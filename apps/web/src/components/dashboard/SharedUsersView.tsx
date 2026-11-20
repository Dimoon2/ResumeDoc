import { useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  LayoutGrid,
  List,
  Mail,
  Users,
} from "lucide-react";
import type { SummaryDocument, User } from "../../types/summary";
import { DocumentCard } from "./DocumentCard";

interface SharedUsersViewProps {
  users: User[];
  selectedUserId: string | null;
  onSelectUser: (userId: string | null) => void;
  sharedDocuments: SummaryDocument[];
  onOpenDocument: (doc: SummaryDocument) => void;
  onViewOriginal: (doc: SummaryDocument) => void;
  onQuickExport: (doc: SummaryDocument) => void;
  onOpenExportModal: (doc: SummaryDocument) => void;
  onShareDocument: (doc: SummaryDocument) => void;
}

export function SharedUsersView({
  users,
  selectedUserId,
  onSelectUser,
  sharedDocuments,
  onOpenDocument,
  onViewOriginal,
  onQuickExport,
  onOpenExportModal,
  onShareDocument,
}: SharedUsersViewProps) {
  const [cardLayout, setCardLayout] = useState<"grid" | "list">("grid");
  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  const accessibleUsers = users.filter((user) =>
    sharedDocuments.some((d) => d.sharedByUserId === user.id)
  );

  if (!selectedUser) {
    return (
      <div key="users-list" className="animate-fade-up space-y-6">
        <div>
          <h1 className="font-display text-[22px] sm:text-[28px] font-semibold leading-[30px] sm:leading-[36px] tracking-[-0.015em] text-brand-dark dark:text-night-text">
            Compartidos
          </h1>
          <p className="mt-1 text-[14px] text-brand-dark/75 dark:text-night-text/70">
            Usuarios a los que tienes acceso. Entra al perfil de un usuario para ver sus resúmenes.
          </p>
        </div>

        {accessibleUsers.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border p-8 sm:p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light dark:bg-night-elevated text-brand-primary dark:text-brand-accent">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="font-display text-[16px] font-semibold text-brand-dark dark:text-night-text">
              No tienes acceso a otros usuarios todavía
            </h2>
            <p className="mt-1 text-[14px] text-brand-dark/70 dark:text-night-text/65">
              Cuando un integrante comparta sus resúmenes contigo, aparecerá aquí.
            </p>
          </div>
        ) : (
          <section
            aria-label="Usuarios a los que tienes acceso"
            className="rounded-2xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border divide-y divide-brand-card/75 dark:divide-night-border overflow-hidden shadow-sm"
          >
            {accessibleUsers.map((user) => {
              const count = sharedDocuments.filter(
                (d) => d.sharedByUserId === user.id
              ).length;

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => onSelectUser(user.id)}
                  className="group w-full px-4 sm:px-5 py-4 text-left transition-all duration-150 hover:bg-brand-light/70 dark:hover:bg-night-elevated/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-accent"
                >
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-card dark:bg-night-elevated text-[13px] font-bold text-brand-dark dark:text-night-text transition-transform duration-150 group-hover:scale-105">
                      {user.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-brand-dark dark:text-night-text group-hover:text-brand-primary dark:group-hover:text-brand-accent transition-colors">
                        {user.name}
                      </p>
                      <p className="truncate text-[13px] text-brand-dark/75 dark:text-night-text/70">
                        {user.role} · {user.department}
                      </p>
                      <p className="truncate text-[12px] text-brand-dark/60 dark:text-night-text/55">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-[58px] sm:pl-0">
                    <span className="rounded-full bg-brand-light dark:bg-night-elevated border border-brand-card dark:border-night-border px-3 py-1 text-[12px] font-bold text-brand-dark dark:text-night-text tabular-nums whitespace-nowrap group-hover:bg-brand-card/60 dark:group-hover:bg-night-inset transition-colors">
                      {count} {count === 1 ? "resumen" : "resúmenes"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-brand-dark/50 dark:text-night-text/50 group-hover:text-brand-primary dark:group-hover:text-brand-accent group-hover:translate-x-1 transition-all duration-150" />
                  </div>
                </button>
              );
            })}
          </section>
        )}
      </div>
    );
  }

  const userDocuments = sharedDocuments.filter(
    (d) => d.sharedByUserId === selectedUser.id
  );

  return (
    <div key={selectedUser.id} className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onSelectUser(null)}
          className="inline-flex h-11 sm:h-10 items-center gap-2 rounded-xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border px-3.5 text-[13px] font-semibold text-brand-dark dark:text-night-text hover:border-brand-accent dark:hover:border-brand-accent hover:text-brand-primary dark:hover:text-brand-accent transition-all duration-150 active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver a usuarios compartidos</span>
        </button>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border shadow-sm">
          <button
            type="button"
            onClick={() => setCardLayout("grid")}
            aria-label="Vista en cuadrícula"
            className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-95 ${
              cardLayout === "grid"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-brand-dark dark:text-night-text hover:bg-brand-light dark:hover:bg-night-elevated"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCardLayout("list")}
            aria-label="Vista en lista"
            className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-95 ${
              cardLayout === "list"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-brand-dark dark:text-night-text hover:bg-brand-light dark:hover:bg-night-elevated"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-night-surface border border-brand-accent dark:border-night-accent p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-azure-floating">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-brand-card dark:bg-night-elevated text-[15px] sm:text-[16px] font-bold text-brand-dark dark:text-night-text">
            {selectedUser.initials}
          </div>
          <div className="space-y-1 min-w-0">
            <h1 className="font-display text-[18px] sm:text-[22px] font-semibold text-brand-dark dark:text-night-text truncate">
              {selectedUser.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-medium text-brand-dark/75 dark:text-night-text/70 tabular-nums">
              <span>{selectedUser.role}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedUser.department}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 break-all">
                <Mail className="h-3.5 w-3.5 text-brand-primary dark:text-brand-accent shrink-0" />
                {selectedUser.email}
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <span className="inline-block rounded-full bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border px-3.5 py-1.5 text-[12px] font-semibold text-brand-dark dark:text-night-text tabular-nums whitespace-nowrap">
            {userDocuments.length}{" "}
            {userDocuments.length === 1
              ? "resumen disponible"
              : "resúmenes disponibles"}
          </span>
        </div>
      </div>

      {userDocuments.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border p-8 sm:p-12 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light dark:bg-night-elevated text-brand-primary dark:text-brand-accent">
            <FileText className="h-5 w-5" />
          </div>
          <h2 className="font-display text-[16px] font-semibold text-brand-dark dark:text-night-text">
            Sin resultados para mostrar
          </h2>
          <p className="mt-1 text-[14px] text-brand-dark/70 dark:text-night-text/65">
            No hay resúmenes de {selectedUser.name} que coincidan con tu búsqueda.
          </p>
        </div>
      ) : cardLayout === "list" ? (
        <div className="space-y-4">
          {userDocuments.map((doc, idx) => (
            <div
              key={doc.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(idx, 6) * 45}ms` }}
            >
              <DocumentCard
                doc={doc}
                layout="list"
                onOpenDocument={onOpenDocument}
                onViewOriginal={onViewOriginal}
                onQuickExport={onQuickExport}
                onOpenExportModal={onOpenExportModal}
                onShareDocument={onShareDocument}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {userDocuments.map((doc, idx) => (
            <div
              key={doc.id}
              className="animate-fade-up h-full"
              style={{ animationDelay: `${Math.min(idx, 6) * 45}ms` }}
            >
              <DocumentCard
                doc={doc}
                layout="grid"
                onOpenDocument={onOpenDocument}
                onViewOriginal={onViewOriginal}
                onQuickExport={onQuickExport}
                onOpenExportModal={onOpenExportModal}
                onShareDocument={onShareDocument}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}