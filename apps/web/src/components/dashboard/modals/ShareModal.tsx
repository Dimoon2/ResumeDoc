import { useState } from "react";
import { Check, UserPlus, Users, X } from "lucide-react";
import type {
  SharePermission,
  SharedAccessEntry,
  SummaryDocument,
  User,
} from "../../../types/summary";
import { formatSpanishDate } from "../../../utils/summaryFiles";

interface ShareModalProps {
  doc: SummaryDocument | null;
  workspaceUsers: User[];
  onClose: () => void;
  onUpdateShare: (docId: string, nextSharedWith: SharedAccessEntry[]) => void;
}

export function ShareModal({
  doc,
  workspaceUsers,
  onClose,
  onUpdateShare,
}: ShareModalProps) {
  const [filterText, setFilterText] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  if (!doc) return null;

  const filteredUsers = workspaceUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(filterText.toLowerCase()) ||
      u.department.toLowerCase().includes(filterText.toLowerCase())
  );

  const getEntry = (userId: string) =>
    doc.sharedWith.find((entry) => entry.userId === userId);

  const toggleUserAccess = (userId: string) => {
    const existing = getEntry(userId);
    if (existing) {
      onUpdateShare(
        doc.id,
        doc.sharedWith.filter((e) => e.userId !== userId)
      );
    } else {
      onUpdateShare(doc.id, [
        ...doc.sharedWith,
        {
          userId,
          permission: "Lectura",
          sharedAt: formatSpanishDate(new Date()),
        },
      ]);
    }
  };

  const changePermission = (userId: string, permission: SharePermission) => {
    const exists = getEntry(userId);
    if (!exists) {
      onUpdateShare(doc.id, [
        ...doc.sharedWith,
        {
          userId,
          permission,
          sharedAt: formatSpanishDate(new Date()),
        },
      ]);
      return;
    }
    onUpdateShare(
      doc.id,
      doc.sharedWith.map((e) =>
        e.userId === userId ? { ...e, permission } : e
      )
    );
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/app?doc=${encodeURIComponent(doc.id)}`
      );
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // Ignorar error de portapapeles
    }
  };

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-brand-dark/25 dark:bg-black/65 backdrop-blur-[2px] overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="animate-modal-in w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border shadow-azure-active overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-brand-card dark:border-night-border bg-gradient-to-r from-brand-light to-white dark:from-night-inset dark:to-night-surface flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2
              id="share-modal-title"
              className="font-display text-[16px] sm:text-[18px] font-semibold text-brand-dark dark:text-night-text"
            >
              Compartir acceso
            </h2>
            <p className="text-[12px] text-brand-dark/70 dark:text-night-text/65 truncate">
              {doc.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar compartir"
            className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg text-brand-dark dark:text-night-text hover:bg-brand-card/40 dark:hover:bg-night-elevated transition-colors active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto overscroll-contain">
          {workspaceUsers.length === 0 ? (
            <div className="rounded-2xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border p-6 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border text-brand-primary dark:text-brand-accent">
                <Users className="h-5 w-5" />
              </div>
              <p className="font-display text-[14px] font-semibold text-brand-dark dark:text-night-text">
                Compartición entre usuarios próximamente
              </p>
              <p className="text-[13px] text-brand-dark/70 dark:text-night-text/65">
                Cuando el servidor habilite la gestión de permisos entre cuentas, podrás asignar acceso aquí.
              </p>
            </div>
          ) : (
            <>
              <div>
                <input
                  type="search"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filtrar integrantes por nombre o área..."
                  aria-label="Filtrar integrantes"
                  className="h-[42px] w-full rounded-xl bg-white dark:bg-night-inset border border-brand-card dark:border-night-border px-3.5 text-[14px] text-brand-dark dark:text-night-text placeholder:text-brand-accent dark:placeholder:text-night-text/45 transition-all duration-150 focus:outline-none focus:border-brand-primary dark:focus:border-brand-accent focus:shadow-[0_0_0_3px_rgba(127,196,242,0.28)]"
                />
              </div>

              {filteredUsers.length === 0 ? (
                <p className="text-center text-[13px] text-brand-dark/70 dark:text-night-text/65 py-4">
                  No se encontraron integrantes con ese filtro.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {filteredUsers.map((user) => {
                    const entry = getEntry(user.id);
                    const isShared = Boolean(entry);

                    return (
                      <div
                        key={user.id}
                        className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-150 ${
                          isShared
                            ? "bg-brand-light dark:bg-night-inset border-brand-accent dark:border-brand-accent"
                            : "bg-white dark:bg-night-surface border-brand-card dark:border-night-border hover:border-brand-accent/70 dark:hover:border-night-accent"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-card dark:bg-night-elevated text-[12px] font-bold text-brand-dark dark:text-night-text">
                            {user.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-brand-dark dark:text-night-text">
                              {user.name}
                            </p>
                            <p className="truncate text-[12px] text-brand-dark/65 dark:text-night-text/60">
                              {user.department}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 shrink-0">
                          {isShared && entry ? (
                            <>
                              <select
                                aria-label={`Permiso para ${user.name}`}
                                value={entry.permission}
                                onChange={(e) =>
                                  changePermission(
                                    user.id,
                                    e.target.value as SharePermission
                                  )
                                }
                                className="h-9 sm:h-8 rounded-lg bg-white dark:bg-night-surface border border-brand-card dark:border-night-border px-2 text-[12px] font-semibold text-brand-dark dark:text-night-text focus:outline-none focus:border-brand-primary dark:focus:border-brand-accent"
                              >
                                <option value="Lectura">Lectura</option>
                                <option value="Exportar">Exportar</option>
                                <option value="Editor">Editor</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => toggleUserAccess(user.id)}
                                className="h-9 sm:h-8 rounded-lg px-2.5 text-[12px] font-semibold text-brand-dark/75 dark:text-night-text/75 hover:bg-brand-card/50 dark:hover:bg-night-elevated hover:text-brand-dark dark:hover:text-night-text transition-all duration-150 active:scale-95"
                              >
                                Quitar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleUserAccess(user.id)}
                              className="inline-flex h-9 sm:h-8 items-center gap-1.5 rounded-lg bg-white dark:bg-night-inset border border-brand-card dark:border-night-border px-3 text-[12px] font-semibold text-brand-dark dark:text-night-text hover:border-brand-accent dark:hover:border-brand-accent hover:text-brand-primary dark:hover:text-brand-accent transition-all duration-150 active:scale-95"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              <span>Compartir</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-brand-card dark:border-night-border bg-brand-light dark:bg-night-inset flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="inline-flex h-11 sm:h-[42px] items-center gap-2 rounded-xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border px-3.5 sm:px-4 text-[13px] font-semibold text-brand-dark dark:text-night-text hover:border-brand-accent dark:hover:border-brand-accent hover:text-brand-primary dark:hover:text-brand-accent transition-all duration-150 active:scale-[0.98]"
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4 text-brand-primary dark:text-brand-accent" />
                <span>Enlace copiado</span>
              </>
            ) : (
              <span>Copiar enlace interno</span>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-11 sm:h-[42px] rounded-xl bg-brand-primary px-5 text-[14px] font-semibold text-white shadow-sm shadow-brand-primary/25 hover:bg-brand-dark dark:hover:bg-[#519EE2] transition-all duration-150 active:scale-[0.98]"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}