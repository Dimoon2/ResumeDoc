import { useState } from "react";
import { Check, UserPlus, X } from "lucide-react";
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
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-brand-dark/25 backdrop-blur-[2px] overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="animate-modal-in w-full max-w-lg max-h-[90dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-white border border-brand-card shadow-azure-active overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-brand-card bg-gradient-to-r from-brand-light to-white flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2
              id="share-modal-title"
              className="font-display text-[16px] sm:text-[18px] font-semibold text-brand-dark"
            >
              Compartir acceso
            </h2>
            <p className="text-[12px] text-brand-dark/70 truncate">
              {doc.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar compartir"
            className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg text-brand-dark hover:bg-brand-card/40 transition-colors active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto overscroll-contain">
          <div>
            <input
              type="search"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filtrar integrantes por nombre o área..."
              aria-label="Filtrar integrantes"
              className="h-[42px] w-full rounded-xl bg-white border border-brand-card px-3.5 text-[14px] text-brand-dark placeholder:text-brand-accent transition-all duration-150 focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(127,196,242,0.28)]"
            />
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {filteredUsers.map((user) => {
              const entry = getEntry(user.id);
              const isShared = Boolean(entry);

              return (
                <div
                  key={user.id}
                  className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-150 ${
                    isShared
                      ? "bg-brand-light border-brand-accent"
                      : "bg-white border-brand-card hover:border-brand-accent/70"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-card text-[12px] font-bold text-brand-dark">
                      {user.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-brand-dark">
                        {user.name}
                      </p>
                      <p className="truncate text-[12px] text-brand-dark/65">
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
                          className="h-9 sm:h-8 rounded-lg bg-white border border-brand-card px-2 text-[12px] font-semibold text-brand-dark focus:outline-none focus:border-brand-primary"
                        >
                          <option value="Lectura">Lectura</option>
                          <option value="Exportar">Exportar</option>
                          <option value="Editor">Editor</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => toggleUserAccess(user.id)}
                          className="h-9 sm:h-8 rounded-lg px-2.5 text-[12px] font-semibold text-brand-dark/75 hover:bg-brand-card/50 hover:text-brand-dark transition-all duration-150 active:scale-95"
                        >
                          Quitar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleUserAccess(user.id)}
                        className="inline-flex h-9 sm:h-8 items-center gap-1.5 rounded-lg bg-white border border-brand-card px-3 text-[12px] font-semibold text-brand-dark hover:border-brand-accent hover:text-brand-primary transition-all duration-150 active:scale-95"
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
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-brand-card bg-brand-light flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="inline-flex h-11 sm:h-[42px] items-center gap-2 rounded-xl bg-white border border-brand-card px-3.5 sm:px-4 text-[13px] font-semibold text-brand-dark hover:border-brand-accent hover:text-brand-primary transition-all duration-150 active:scale-[0.98]"
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4 text-brand-primary" />
                <span>Enlace copiado</span>
              </>
            ) : (
              <span>Copiar enlace interno</span>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-11 sm:h-[42px] rounded-xl bg-brand-primary px-5 text-[14px] font-semibold text-white shadow-sm shadow-brand-primary/25 hover:bg-brand-dark transition-all duration-150 active:scale-[0.98]"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}