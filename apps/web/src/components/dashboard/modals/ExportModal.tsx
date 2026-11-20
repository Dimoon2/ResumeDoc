import { useState } from "react";
import { Check, Copy, Download, Printer, X } from "lucide-react";
import type { ExportFormat, SummaryDocument } from "../../../types/summary";
import {
  buildExportContent,
  downloadExportFile,
} from "../../../utils/summaryFiles";

interface ExportModalProps {
  doc: SummaryDocument | null;
  onClose: () => void;
  onDownloaded?: (fileName: string) => void;
}

export function ExportModal({ doc, onClose, onDownloaded }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("txt");
  const [copied, setCopied] = useState(false);

  if (!doc) return null;

  const previewText = buildExportContent(doc, format);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignorar error de portapapeles
    }
  };

  const handleDownload = () => {
    const fileName = downloadExportFile(doc, format);
    onDownloaded?.(fileName);
    onClose();
  };

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-brand-dark/25 dark:bg-black/65 backdrop-blur-[2px] overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="animate-modal-in w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border shadow-azure-active overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-brand-card dark:border-night-border bg-gradient-to-r from-brand-light to-white dark:from-night-inset dark:to-night-surface flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2
              id="export-modal-title"
              className="font-display text-[16px] sm:text-[18px] font-semibold text-brand-dark dark:text-night-text"
            >
              Exportar Resumen
            </h2>
            <p className="text-[12px] text-brand-dark/70 dark:text-night-text/65 truncate">
              {doc.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar exportación"
            className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg text-brand-dark dark:text-night-text hover:bg-brand-card/40 dark:hover:bg-night-elevated transition-colors active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto overscroll-contain">
          <div>
            <span className="block text-[12px] font-semibold text-brand-dark dark:text-night-text mb-2">
              Formato de salida (compatible con Importar)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 p-1 rounded-xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border">
              {[
                { id: "txt", label: "Texto (.txt)" },
                { id: "markdown", label: "Markdown (.md)" },
                { id: "json", label: "JSON (.json)" },
              ].map((opt) => {
                const active = format === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormat(opt.id as ExportFormat)}
                    className={`h-10 sm:h-9 rounded-lg text-[13px] font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap ${
                      active
                        ? "bg-brand-primary text-white shadow-sm"
                        : "text-brand-dark dark:text-night-text hover:bg-white/80 dark:hover:bg-night-elevated"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-semibold text-brand-dark dark:text-night-text">
                Vista previa del archivo
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-primary dark:text-brand-accent hover:text-brand-dark dark:hover:text-white transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar contenido</span>
                  </>
                )}
              </button>
            </div>
            <pre className="max-h-56 sm:max-h-64 overflow-auto rounded-xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border p-3.5 sm:p-4 font-sans text-[12px] leading-[20px] text-brand-dark dark:text-night-text whitespace-pre-wrap break-words">
              {previewText}
            </pre>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-brand-card dark:border-night-border bg-brand-light dark:bg-night-inset flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 sm:h-[42px] items-center gap-2 rounded-xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border px-3.5 sm:px-4 text-[13px] sm:text-[14px] font-semibold text-brand-dark dark:text-night-text hover:border-brand-accent dark:hover:border-brand-accent hover:text-brand-primary dark:hover:text-brand-accent transition-all duration-150 active:scale-[0.98]"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir / PDF</span>
          </button>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 sm:h-[42px] rounded-xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border px-4 text-[14px] font-semibold text-brand-dark dark:text-night-text hover:border-brand-accent dark:hover:border-brand-accent hover:text-brand-primary dark:hover:text-brand-accent transition-all duration-150 active:scale-[0.98]"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex h-11 sm:h-[42px] items-center gap-2 rounded-xl bg-brand-primary px-4 sm:px-5 text-[14px] font-semibold text-white shadow-sm shadow-brand-primary/25 hover:bg-brand-dark dark:hover:bg-[#519EE2] transition-all duration-150 active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              <span>Descargar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}