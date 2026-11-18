import { useState } from "react";
import { ArrowUpRight, Download, Eye, Share2 } from "lucide-react";
import type { FileFormat, SummaryDocument } from "../../types/summary";

interface LibraryTableViewProps {
  documents: SummaryDocument[];
  onOpenDocument: (doc: SummaryDocument) => void;
  onViewOriginal: (doc: SummaryDocument) => void;
  onQuickExport: (doc: SummaryDocument) => void;
  onShareDocument: (doc: SummaryDocument) => void;
}

export function LibraryTableView({
  documents,
  onOpenDocument,
  onViewOriginal,
  onQuickExport,
  onShareDocument,
}: LibraryTableViewProps) {
  const [ownershipFilter, setOwnershipFilter] = useState<
    "all" | "mine" | "shared"
  >("all");
  const [formatFilter, setFormatFilter] = useState<"ALL" | FileFormat>("ALL");

  const filtered = documents.filter((doc) => {
    if (ownershipFilter === "mine" && !doc.isOwnedByMe) return false;
    if (ownershipFilter === "shared" && doc.isOwnedByMe) return false;
    if (formatFilter !== "ALL" && doc.fileType !== formatFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[22px] sm:text-[28px] font-semibold leading-[30px] sm:leading-[36px] tracking-[-0.015em] text-brand-dark">
            Biblioteca Completa
          </h1>
          <p className="mt-1 text-[14px] text-brand-dark/75">
            Índice consolidado de documentos propios y compartidos en tu espacio de trabajo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-brand-card overflow-x-auto max-w-full">
            {[
              { id: "all", label: "Todos" },
              { id: "mine", label: "Propios" },
              { id: "shared", label: "Compartidos" },
            ].map((item) => {
              const active = ownershipFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setOwnershipFilter(item.id as "all" | "mine" | "shared")
                  }
                  className={`h-8 px-3 rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? "bg-brand-primary text-white"
                      : "text-brand-dark hover:bg-brand-light"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-brand-card overflow-x-auto max-w-full">
            {(["ALL", "PDF", "PNG", "JPG"] as const).map((fmt) => {
              const active = formatFilter === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormatFilter(fmt)}
                  className={`h-8 px-2.5 rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? "bg-brand-primary text-white"
                      : "text-brand-dark hover:bg-brand-light"
                  }`}
                >
                  {fmt === "ALL" ? "Formato" : fmt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Vista móvil (< md) */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white border border-brand-card p-8 text-center text-[14px] text-brand-dark/70">
            No hay documentos que coincidan con los filtros seleccionados.
          </div>
        ) : (
          filtered.map((doc) => (
            <article
              key={doc.id}
              className="rounded-2xl bg-white border border-brand-card p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-brand-dark/70 tabular-nums">
                <span className="rounded-full bg-brand-card px-2.5 py-0.5 text-[10px] font-bold tracking-[0.05em] text-brand-dark">
                  {doc.fileType}
                </span>
                <span>{doc.isOwnedByMe ? "Propio" : doc.ownerName}</span>
                <span aria-hidden="true">·</span>
                <span>{doc.createdAt}</span>
              </div>

              <button
                type="button"
                onClick={() => onOpenDocument(doc)}
                className="text-left block w-full"
              >
                <h2 className="font-display text-[15px] font-semibold text-brand-dark line-clamp-2">
                  {doc.title}
                </h2>
                <p className="mt-0.5 text-[12px] text-brand-dark/65 truncate">
                  {doc.fileName}
                </p>
              </button>

              <div className="pt-2 border-t border-brand-card/60 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-brand-dark/75 tabular-nums">
                  {doc.wordCountSummary.toLocaleString("es-ES")} /{" "}
                  {doc.wordCountOriginal.toLocaleString("es-ES")} pal.
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenDocument(doc)}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-light border border-brand-card px-3 text-[12px] font-semibold text-brand-dark"
                  >
                    <span>Abrir</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewOriginal(doc)}
                    aria-label={`Ver original de ${doc.title}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-card text-brand-primary"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickExport(doc)}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-primary px-3 text-[12px] font-semibold text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Exportar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onShareDocument(doc)}
                    aria-label={`Compartir ${doc.title}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-card text-brand-dark"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Vista tablet y escritorio (>= md) */}
      <div className="hidden md:block rounded-2xl bg-white border border-brand-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-light border-b border-brand-card text-[12px] font-semibold text-brand-dark">
                <th className="py-3 px-5">Documento</th>
                <th className="py-3 px-4">Formato</th>
                <th className="py-3 px-4">Origen</th>
                <th className="py-3 px-4 text-right">Palabras</th>
                <th className="py-3 px-4 text-right">Fecha</th>
                <th className="py-3 px-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-card/60 text-[13px] text-brand-dark">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 px-5 text-center text-[14px] text-brand-dark/70"
                  >
                    No hay documentos que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-brand-light/60 transition-colors"
                  >
                    <td className="py-3 px-5 max-w-md">
                      <button
                        type="button"
                        onClick={() => onOpenDocument(doc)}
                        className="text-left font-semibold text-brand-dark hover:text-brand-primary transition-colors truncate block max-w-full"
                      >
                        {doc.title}
                      </button>
                      <span className="text-[11px] text-brand-dark/60 block truncate">
                        {doc.fileName}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="rounded-full bg-brand-card px-2.5 py-0.5 text-[10px] font-bold tracking-[0.05em] text-brand-dark">
                        {doc.fileType}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-brand-dark/80">
                      {doc.isOwnedByMe ? "Propio" : doc.ownerName}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap text-brand-dark/80">
                      {doc.wordCountSummary.toLocaleString("es-ES")} /{" "}
                      {doc.wordCountOriginal.toLocaleString("es-ES")}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap text-brand-dark/75">
                      {doc.createdAt}
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenDocument(doc)}
                          aria-label={`Abrir ${doc.title}`}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-light border border-brand-card px-2.5 text-[12px] font-semibold text-brand-dark hover:border-brand-accent hover:text-brand-primary"
                        >
                          <span>Abrir</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewOriginal(doc)}
                          aria-label={`Ver original de ${doc.title}`}
                          title="Ver documento original"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-card text-brand-primary hover:bg-brand-light hover:border-brand-accent"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onQuickExport(doc)}
                          aria-label={`Exportar ${doc.title}`}
                          title="Exportar"
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-primary px-2.5 text-[12px] font-semibold text-white hover:bg-brand-dark"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Exportar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onShareDocument(doc)}
                          aria-label={`Compartir ${doc.title}`}
                          title="Compartir"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-dark hover:bg-brand-card/40"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}