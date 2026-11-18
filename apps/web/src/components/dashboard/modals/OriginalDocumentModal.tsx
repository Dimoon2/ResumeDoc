import { ExternalLink, FileText, Info, X } from "lucide-react";
import type { SummaryDocument } from "../../../types/summary";

interface OriginalDocumentModalProps {
  doc: SummaryDocument | null;
  onClose: () => void;
}

export function OriginalDocumentModal({
  doc,
  onClose,
}: OriginalDocumentModalProps) {
  if (!doc) return null;

  const isImage = doc.fileType === "PNG" || doc.fileType === "JPG";
  const hasLivePreview = Boolean(doc.originalUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-brand-dark/25 backdrop-blur-[2px] overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="original-modal-title"
    >
      <div className="w-full max-w-4xl max-h-[90dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-white border border-brand-card shadow-azure-active overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-brand-card bg-brand-light flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-brand-card text-brand-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="original-modal-title"
                className="font-display text-[16px] sm:text-[18px] font-semibold text-brand-dark truncate"
              >
                Documento original
              </h2>
              <p className="text-[12px] text-brand-dark/70 truncate tabular-nums">
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
                className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg bg-white border border-brand-card px-3 text-[12px] font-semibold text-brand-dark hover:border-brand-accent hover:text-brand-primary transition-colors"
              >
                <span>Abrir aparte</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar vista del documento original"
              className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-brand-dark hover:bg-brand-card/40"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto overscroll-contain bg-brand-light/40 space-y-4">
          {hasLivePreview && isImage && (
            <div className="rounded-2xl bg-white border border-brand-card p-3 flex justify-center">
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
              className="w-full h-[62dvh] rounded-2xl border border-brand-card bg-white"
            />
          )}

          {!hasLivePreview && (
            <div className="space-y-4">
              <div className="rounded-xl bg-brand-light border border-brand-accent px-4 py-3 flex items-start gap-2.5 text-[13px] text-brand-dark">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-brand-primary" />
                <span>
                  Mostrando el contenido extraído de{" "}
                  <strong>{doc.fileName}</strong>. Cuando subas un archivo en
                  esta sesión o conectes el almacenamiento del backend, aquí se
                  renderizará el PDF o imagen original completo.
                </span>
              </div>

              <div className="rounded-2xl bg-white border border-brand-card p-5 sm:p-6 space-y-3">
                <div className="pb-3 border-b border-brand-card/70 flex flex-wrap items-center justify-between gap-2 text-[12px] font-semibold text-brand-dark/70 tabular-nums">
                  <span>Archivo: {doc.fileName}</span>
                  <span>
                    {doc.wordCountOriginal.toLocaleString("es-ES")} palabras
                    originales
                  </span>
                </div>
                <p className="text-[14px] leading-[24px] text-brand-dark/90 whitespace-pre-wrap">
                  {doc.sourceExcerpt}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-brand-card bg-brand-light flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-[12px] font-medium text-brand-dark/70">
            Subido por {doc.ownerName} · {doc.createdAt}
          </span>
          <div className="flex items-center gap-2.5">
            {hasLivePreview && (
              <a
                href={doc.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sm:hidden inline-flex h-11 items-center gap-1.5 rounded-lg bg-white border border-brand-card px-3.5 text-[13px] font-semibold text-brand-dark"
              >
                <span>Abrir aparte</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-11 sm:h-[42px] rounded-lg bg-brand-primary px-5 text-[14px] font-semibold text-white hover:bg-brand-dark transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}