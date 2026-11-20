import {
  ArrowUpRight,
  Download,
  Eye,
  Share2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import type { SummaryDocument } from "../../types/summary";

interface DocumentCardProps {
  doc: SummaryDocument;
  layout?: "grid" | "list";
  onOpenDocument: (doc: SummaryDocument) => void;
  onViewOriginal: (doc: SummaryDocument) => void;
  onQuickExport: (doc: SummaryDocument) => void;
  onOpenExportModal: (doc: SummaryDocument) => void;
  onShareDocument: (doc: SummaryDocument) => void;
  onDeleteDocument?: (docId: string) => void;
}

export function DocumentCard({
  doc,
  layout = "grid",
  onOpenDocument,
  onViewOriginal,
  onQuickExport,
  onOpenExportModal,
  onShareDocument,
  onDeleteDocument,
}: DocumentCardProps) {
  const reductionPct =
    doc.wordCountOriginal > 0
      ? Math.max(
          1,
          Math.round(
            ((doc.wordCountOriginal - doc.wordCountSummary) /
              doc.wordCountOriginal) *
              100
          )
        )
      : 85;

  if (layout === "list") {
    return (
      <article className="group rounded-2xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-accent dark:hover:border-night-accent hover:shadow-azure-floating flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] font-semibold text-brand-dark/70 dark:text-night-text/65 tabular-nums">
            <span className="rounded-full bg-brand-light dark:bg-night-elevated border border-brand-card dark:border-night-border px-2.5 py-0.5 text-[10px] font-bold tracking-[0.05em] text-brand-dark dark:text-night-text">
              {doc.fileType}
            </span>
            <span>{doc.createdAt}</span>
            <span aria-hidden="true">·</span>
            <span>{doc.readingTimeMinutes} min lectura</span>
            <span className="rounded-full bg-brand-light dark:bg-night-inset px-2 py-0.5 text-[11px] font-bold text-brand-primary dark:text-brand-accent">
              -{reductionPct}%
            </span>
            {!doc.isOwnedByMe && (
              <>
                <span aria-hidden="true">·</span>
                <span>Por {doc.ownerName}</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenDocument(doc)}
            className="text-left block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded"
          >
            <h3 className="font-display text-[16px] font-semibold leading-[24px] text-brand-dark dark:text-night-text group-hover:text-brand-primary dark:group-hover:text-brand-accent transition-colors line-clamp-2 sm:truncate">
              {doc.title}
            </h3>
          </button>

          <p className="text-[14px] leading-[22px] text-brand-dark/80 dark:text-night-text/75 line-clamp-2">
            {doc.executiveSummary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
          <button
            type="button"
            onClick={() => onOpenDocument(doc)}
            className="group/btn inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border px-3 text-[13px] font-semibold text-brand-dark dark:text-night-text transition-all duration-150 hover:border-brand-accent dark:hover:border-brand-accent hover:text-brand-primary dark:hover:text-brand-accent active:scale-[0.97] whitespace-nowrap"
          >
            <span>Abrir</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </button>

          <button
            type="button"
            onClick={() => onViewOriginal(doc)}
            className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-xl border border-brand-card dark:border-night-border px-3 text-[13px] font-semibold text-brand-dark dark:text-night-text transition-all duration-150 hover:bg-brand-light dark:hover:bg-night-elevated hover:border-brand-accent dark:hover:border-brand-accent active:scale-[0.97] whitespace-nowrap"
          >
            <Eye className="h-3.5 w-3.5 text-brand-primary dark:text-brand-accent" />
            <span>Original</span>
          </button>

          <div className="inline-flex items-center">
            <button
              type="button"
              onClick={() => onQuickExport(doc)}
              className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-l-xl bg-brand-primary px-3.5 text-[13px] font-semibold text-white transition-all duration-150 hover:bg-brand-dark dark:hover:bg-[#519EE2] active:scale-[0.98] whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenExportModal(doc)}
              aria-label={`Opciones de exportación para ${doc.title}`}
              title="Elegir formato (MD, TXT, JSON, PDF)"
              className="inline-flex h-10 sm:h-9 w-9 sm:w-8 items-center justify-center rounded-r-xl bg-brand-primary/90 border-l border-white/25 text-white transition-all duration-150 hover:bg-brand-dark dark:hover:bg-[#519EE2] active:scale-[0.97]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onShareDocument(doc)}
            className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-xl border border-brand-card dark:border-night-border px-3 text-[13px] font-semibold text-brand-dark dark:text-night-text transition-all duration-150 hover:bg-brand-card/40 dark:hover:bg-night-elevated active:scale-[0.97] whitespace-nowrap"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Compartir</span>
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="group rounded-2xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 hover:border-brand-accent dark:hover:border-night-accent hover:shadow-azure-floating flex flex-col justify-between h-full">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-brand-dark/70 dark:text-night-text/65 tabular-nums">
            <span className="rounded-full bg-brand-light dark:bg-night-elevated border border-brand-card dark:border-night-border px-2.5 py-0.5 text-[10px] font-bold tracking-[0.05em] text-brand-dark dark:text-night-text">
              {doc.fileType}
            </span>
            <span>{doc.createdAt}</span>
            <span aria-hidden="true">·</span>
            <span>{doc.readingTimeMinutes} min</span>
            <span className="rounded-full bg-brand-light dark:bg-night-inset px-2 py-0.5 text-[11px] font-bold text-brand-primary dark:text-brand-accent">
              -{reductionPct}%
            </span>
          </div>

          {doc.isOwnedByMe && onDeleteDocument && (
            <button
              type="button"
              onClick={() => onDeleteDocument(doc.id)}
              aria-label={`Eliminar ${doc.title}`}
              title="Eliminar resumen"
              className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 flex h-9 w-9 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-brand-dark/60 dark:text-night-text/60 hover:bg-brand-light dark:hover:bg-night-elevated hover:text-brand-dark dark:hover:text-night-text transition-all duration-150 active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpenDocument(doc)}
          className="text-left block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded"
        >
          <h3 className="font-display text-[16px] font-semibold leading-[24px] text-brand-dark dark:text-night-text group-hover:text-brand-primary dark:group-hover:text-brand-accent transition-colors line-clamp-2">
            {doc.title}
          </h3>
        </button>

        <p className="text-[14px] leading-[22px] text-brand-dark/80 dark:text-night-text/75 line-clamp-3">
          {doc.executiveSummary}
        </p>

        {doc.topics.length > 0 && (
          <p className="text-[12px] font-medium text-brand-dark/65 dark:text-night-text/60 truncate">
            {doc.topics.join(" · ")}
          </p>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-brand-card/70 dark:border-night-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenDocument(doc)}
            className="group/btn inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border px-3 text-[13px] font-semibold text-brand-dark dark:text-night-text transition-all duration-150 hover:border-brand-accent dark:hover:border-brand-accent hover:text-brand-primary dark:hover:text-brand-accent active:scale-[0.97] whitespace-nowrap"
          >
            <span>Abrir</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </button>

          <button
            type="button"
            onClick={() => onViewOriginal(doc)}
            title="Ver documento original"
            className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-xl border border-brand-card dark:border-night-border px-2.5 text-[13px] font-semibold text-brand-dark dark:text-night-text transition-all duration-150 hover:bg-brand-light dark:hover:bg-night-elevated hover:border-brand-accent dark:hover:border-brand-accent active:scale-[0.97] whitespace-nowrap"
          >
            <Eye className="h-3.5 w-3.5 text-brand-primary dark:text-brand-accent" />
            <span>Original</span>
          </button>

          <button
            type="button"
            onClick={() => onShareDocument(doc)}
            aria-label={`Compartir ${doc.title}`}
            title="Compartir"
            className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold text-brand-dark dark:text-night-text transition-all duration-150 hover:bg-brand-card/40 dark:hover:bg-night-elevated active:scale-[0.97] whitespace-nowrap"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Compartir</span>
          </button>
        </div>

        <div className="inline-flex items-center">
          <button
            type="button"
            onClick={() => onQuickExport(doc)}
            className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-l-xl bg-brand-primary px-3.5 text-[13px] font-semibold text-white transition-all duration-150 hover:bg-brand-dark dark:hover:bg-[#519EE2] active:scale-[0.98] whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenExportModal(doc)}
            aria-label={`Opciones de exportación para ${doc.title}`}
            title="Elegir formato (MD, TXT, JSON, PDF)"
            className="inline-flex h-10 sm:h-9 w-9 sm:w-8 items-center justify-center rounded-r-xl bg-brand-primary/90 border-l border-white/25 text-white transition-all duration-150 hover:bg-brand-dark dark:hover:bg-[#519EE2] active:scale-[0.97]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}