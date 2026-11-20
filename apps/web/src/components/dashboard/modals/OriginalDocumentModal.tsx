import { useEffect, useState } from "react";
import { ExternalLink, FileText, Info, Loader2, X } from "lucide-react";
import { documentService } from "../../../services/documentService";
import type { SummaryDocument } from "../../../types/summary";

interface OriginalDocumentModalProps {
  doc: SummaryDocument | null;
  onClose: () => void;
}

export function OriginalDocumentModal({
  doc,
  onClose,
}: OriginalDocumentModalProps) {
  const [fullText, setFullText] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  useEffect(() => {
    if (!doc || doc.originalUrl || doc.backendId === undefined) {
      setFullText(null);
      return;
    }

    let cancelled = false;
    setLoadingText(true);
    documentService
      .getText(doc.backendId)
      .then((text) => {
        if (!cancelled) setFullText(text);
      })
      .catch(() => {
        if (!cancelled) setFullText(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingText(false);
      });

    return () => {
      cancelled = true;
    };
  }, [doc]);

  if (!doc) return null;

  const isImage = doc.fileType === "PNG" || doc.fileType === "JPG";
  const hasLivePreview = Boolean(doc.originalUrl);
  const displayText = fullText ?? doc.sourceExcerpt;

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-brand-dark/25 dark:bg-black/65 backdrop-blur-[2px] overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="original-modal-title"
    >
      <div className="animate-modal-in w-full max-w-4xl max-h-[90dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border shadow-azure-active overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-brand-card dark:border-night-border bg-gradient-to-r from-brand-light to-white dark:from-night-inset dark:to-night-surface flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border text-brand-primary dark:text-brand-accent shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="original-modal-title"
                className="font-display text-[16px] sm:text-[18px] font-semibold text-brand-dark dark:text-night-text truncate"
              >
                Documento original
              </h2>
              <p className="text-[12px] text-brand-dark/70 dark:text-night-text/65 truncate tabular-nums">
                {doc.fileName} · {doc.fileType} · {doc.fileSizeLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasLivePreview && (
              <a
                href={doc.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border px-3 text-[12px] font-semibold text-brand-dark dark:text-night-text hover:border-brand-accent dark:hover:border-brand-accent hover:text-brand-primary dark:hover:text-brand-accent transition-all duration-150 active:scale-[0.98]"
              >
                <span>Abrir aparte</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar vista del documento original"
              className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-brand-dark dark:text-night-text hover:bg-brand-card/40 dark:hover:bg-night-elevated transition-colors active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto overscroll-contain bg-brand-light/40 dark:bg-night-inset/60 space-y-4">
          {hasLivePreview && isImage && (
            <div className="rounded-2xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border p-3 flex justify-center shadow-sm">
              <img
                src={doc.originalUrl}
                alt={`Documento original ${doc.fileName}`}
                className="max-h-[62dvh] w-auto rounded-xl object-contain"
              />
            </div>
          )}

          {hasLivePreview && doc.fileType === "PDF" && (
            <iframe
              src={doc.originalUrl}
              title={`Vista previa de ${doc.fileName}`}
              className="w-full h-[62dvh] rounded-2xl border border-brand-card dark:border-night-border bg-white shadow-sm"
            />
          )}

          {!hasLivePreview && (
            <div className="space-y-4">
              <div className="rounded-xl bg-brand-light dark:bg-night-inset border border-brand-accent dark:border-night-accent px-4 py-3 flex items-start gap-2.5 text-[13px] text-brand-dark dark:text-night-text">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-brand-primary dark:text-brand-accent" />
                <span>
                  Mostrando el texto completo extraído en el servidor para{" "}
                  <strong>{doc.fileName}</strong>.
                </span>
              </div>

              <div className="rounded-2xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border p-5 sm:p-6 space-y-3 shadow-sm">
                <div className="pb-3 border-b border-brand-card/70 dark:border-night-border flex flex-wrap items-center justify-between gap-2 text-[12px] font-semibold text-brand-dark/70 dark:text-night-text/65 tabular-nums">
                  <span>Archivo: {doc.fileName}</span>
                  <span>
                    {doc.wordCountOriginal > 0
                      ? `${doc.wordCountOriginal.toLocaleString("es-ES")} palabras originales`
                      : doc.fileSizeLabel}
                  </span>
                </div>

                {loadingText ? (
                  <div className="py-10 flex items-center justify-center gap-2 text-[13px] text-brand-dark/70 dark:text-night-text/65">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-primary dark:text-brand-accent" />
                    <span>Cargando texto extraído...</span>
                  </div>
                ) : (
                  <p className="text-[14px] leading-[24px] text-brand-dark/90 dark:text-night-text/90 whitespace-pre-wrap">
                    {displayText || "El documento no contiene texto extraído."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-brand-card dark:border-night-border bg-brand-light dark:bg-night-inset flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-[12px] font-medium text-brand-dark/70 dark:text-night-text/65">
            Subido por {doc.ownerName} · {doc.createdAt}
          </span>
          <div className="flex items-center gap-2.5">
            {hasLivePreview && (
              <a
                href={doc.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sm:hidden inline-flex h-11 items-center gap-1.5 rounded-xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border px-3.5 text-[13px] font-semibold text-brand-dark dark:text-night-text active:scale-[0.98]"
              >
                <span>Abrir aparte</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-11 sm:h-[42px] rounded-xl bg-brand-primary px-5 text-[14px] font-semibold text-white shadow-sm shadow-brand-primary/25 hover:bg-brand-dark dark:hover:bg-[#519EE2] transition-all duration-150 active:scale-[0.98]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}