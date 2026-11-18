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
      <article className="group rounded-2xl bg-white border border-brand-card p-4 sm:p-5 transition-all duration-150 hover:border-brand-accent flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] font-semibold text-brand-dark/70 tabular-nums">
            <span className="text-brand-dark">{doc.fileType}</span>
            <span aria-hidden="true">·</span>
            <span>{doc.createdAt}</span>
            <span aria-hidden="true">·</span>
            <span>{doc.readingTimeMinutes} min lectura</span>
            <span aria-hidden="true">·</span>
            <span>-{reductionPct}% extensión</span>
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
            <h3 className="font-display text-[16px] font-semibold leading-[24px] text-brand-dark group-hover:text-brand-primary transition-colors line-clamp-2 sm:truncate">
              {doc.title}
            </h3>
          </button>

          <p className="text-[14px] leading-[22px] text-brand-dark/80 line-clamp-2">
            {doc.executiveSummary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
          <button
            type="button"
            onClick={() => onOpenDocument(doc)}
            className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-lg bg-brand-light border border-brand-card px-3 text-[13px] font-semibold text-brand-dark transition-colors hover:border-brand-accent hover:text-brand-primary whitespace-nowrap"
          >
            <span>Abrir</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onViewOriginal(doc)}
            className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-lg border border-brand-card px-3 text-[13px] font-semibold text-brand-dark transition-colors hover:bg-brand-light hover:border-brand-accent whitespace-nowrap"
          >
            <Eye className="h-3.5 w-3.5 text-brand-primary" />
            <span>Original</span>
          </button>

          <div className="inline-flex items-center">
            <button
              type="button"
              onClick={() => onQuickExport(doc)}
              className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-l-lg bg-brand-primary px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenExportModal(doc)}
              aria-label={`Opciones de exportación para ${doc.title}`}
              title="Elegir formato (MD, TXT, JSON, PDF)"
              className="inline-flex h-10 sm:h-9 w-9 sm:w-8 items-center justify-center rounded-r-lg bg-brand-primary/90 border-l border-white/25 text-white transition-colors hover:bg-brand-dark"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onShareDocument(doc)}
            className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-lg border border-brand-card px-3 text-[13px] font-semibold text-brand-dark transition-colors hover:bg-brand-card/40 whitespace-nowrap"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Compartir</span>
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="group rounded-2xl bg-white border border-brand-card p-4 sm:p-5 transition-all duration-150 hover:border-brand-accent flex flex-col justify-between h-full">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] font-semibold text-brand-dark/70 tabular-nums">
            <span className="rounded-full bg-brand-card px-2.5 py-0.5 text-[10px] font-bold tracking-[0.05em] text-brand-dark">
              {doc.fileType}
            </span>
            <span>{doc.createdAt}</span>
            <span aria-hidden="true">·</span>
            <span>{doc.readingTimeMinutes} min</span>
            <span aria-hidden="true">·</span>
            <span>-{reductionPct}%</span>
          </div>

          {doc.isOwnedByMe && onDeleteDocument && (
            <button
              type="button"
              onClick={() => onDeleteDocument(doc.id)}
              aria-label={`Eliminar ${doc.title}`}
              title="Eliminar resumen"
              className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 flex h-9 w-9 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-brand-dark/60 hover:bg-brand-card/50 hover:text-brand-dark transition-all duration-150"
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
          <h3 className="font-display text-[16px] font-semibold leading-[24px] text-brand-dark group-hover:text-brand-primary transition-colors line-clamp-2">
            {doc.title}
          </h3>
        </button>

        <p className="text-[14px] leading-[22px] text-brand-dark/80 line-clamp-3">
          {doc.executiveSummary}
        </p>

        {doc.topics.length > 0 && (
          <p className="text-[12px] font-medium text-brand-dark/65 truncate">
            {doc.topics.join(" · ")}
          </p>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-brand-card/70 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenDocument(doc)}
            className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-lg bg-brand-light border border-brand-card px-3 text-[13px] font-semibold text-brand-dark transition-colors hover:border-brand-accent hover:text-brand-primary whitespace-nowrap"
          >
            <span>Abrir</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onViewOriginal(doc)}
            title="Ver documento original"
            className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-lg border border-brand-card px-2.5 text-[13px] font-semibold text-brand-dark transition-colors hover:bg-brand-light hover:border-brand-accent whitespace-nowrap"
          >
            <Eye className="h-3.5 w-3.5 text-brand-primary" />
            <span>Original</span>
          </button>

          <button
            type="button"
            onClick={() => onShareDocument(doc)}
            aria-label={`Compartir ${doc.title}`}
            title="Compartir"
            className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-brand-dark transition-colors hover:bg-brand-card/40 whitespace-nowrap"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Compartir</span>
          </button>
        </div>

        <div className="inline-flex items-center">
          <button
            type="button"
            onClick={() => onQuickExport(doc)}
            className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-l-lg bg-brand-primary px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenExportModal(doc)}
            aria-label={`Opciones de exportación para ${doc.title}`}
            title="Elegir formato (MD, TXT, JSON, PDF)"
            className="inline-flex h-10 sm:h-9 w-9 sm:w-8 items-center justify-center rounded-r-lg bg-brand-primary/90 border-l border-white/25 text-white transition-colors hover:bg-brand-dark"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}