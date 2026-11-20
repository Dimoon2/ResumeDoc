import { useState } from "react";
import { ArrowLeft, Download, Eye, Share2, UserCheck } from "lucide-react";
import type { SummaryDocument, User } from "../../types/summary";
import { OctyMascot } from "../ui/OctyMascot";

interface SynthesisReaderViewProps {
  doc: SummaryDocument;
  workspaceUsers: User[];
  onBack: () => void;
  onViewOriginal: (doc: SummaryDocument) => void;
  onExport: (doc: SummaryDocument) => void;
  onShare: (doc: SummaryDocument) => void;
}

type ReaderTab = "summary" | "actions" | "source";

export function SynthesisReaderView({
  doc,
  workspaceUsers,
  onBack,
  onViewOriginal,
  onExport,
  onShare,
}: SynthesisReaderViewProps) {
  const [activeTab, setActiveTab] = useState<ReaderTab>("summary");

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
      : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 sm:h-10 items-center gap-2 rounded-xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border px-3.5 text-[13px] font-semibold text-brand-dark dark:text-night-text hover:border-brand-accent dark:hover:border-brand-accent hover:text-brand-primary dark:hover:text-brand-accent transition-all duration-150 active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver a resúmenes</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onViewOriginal(doc)}
            className="inline-flex h-11 sm:h-10 items-center gap-2 rounded-xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border px-4 text-[13px] font-semibold text-brand-dark dark:text-night-text hover:border-brand-accent dark:hover:border-brand-accent hover:text-brand-primary dark:hover:text-brand-accent hover:-translate-y-0.5 transition-all duration-150 active:translate-y-0 active:scale-[0.98]"
          >
            <Eye className="h-4 w-4 text-brand-primary dark:text-brand-accent" />
            <span>Ver original</span>
          </button>

          <button
            type="button"
            onClick={() => onExport(doc)}
            className="inline-flex h-11 sm:h-10 items-center gap-2 rounded-xl bg-brand-primary px-4 text-[13px] font-semibold text-white shadow-sm shadow-brand-primary/25 hover:bg-brand-dark dark:hover:bg-[#519EE2] hover:-translate-y-0.5 transition-all duration-150 active:translate-y-0 active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>

          <button
            type="button"
            onClick={() => onShare(doc)}
            className="inline-flex h-11 sm:h-10 items-center gap-2 rounded-xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border px-4 text-[13px] font-semibold text-brand-dark dark:text-night-text hover:border-brand-accent dark:hover:border-brand-accent hover:text-brand-primary dark:hover:text-brand-accent transition-all duration-150 active:scale-[0.98]"
          >
            <Share2 className="h-4 w-4" />
            <span>Compartir</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 items-start">
        <article className="xl:col-span-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border p-4 sm:p-6 lg:p-8 space-y-6 min-w-0 shadow-azure-floating">
          <header className="space-y-3 pb-5 sm:pb-6 border-b border-brand-card/75 dark:border-night-border">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] font-semibold text-brand-dark/70 dark:text-night-text/65 tabular-nums">
              <span className="rounded-full bg-brand-light dark:bg-night-elevated border border-brand-card dark:border-night-border px-2.5 py-0.5 text-[10px] font-bold tracking-[0.05em] text-brand-dark dark:text-night-text">
                {doc.fileType}
              </span>
              <span className="break-all">{doc.fileName}</span>
              <span aria-hidden="true">·</span>
              <span>{doc.fileSizeLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{doc.createdAt}</span>
              {!doc.isOwnedByMe && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Compartido por {doc.ownerName}</span>
                </>
              )}
            </div>

            <h1 className="font-display text-[22px] sm:text-[28px] font-bold leading-[30px] sm:leading-[36px] tracking-[-0.015em] text-brand-dark dark:text-night-text">
              {doc.title}
            </h1>

            {doc.topics.length > 0 && (
              <p className="text-[13px] font-semibold text-brand-primary dark:text-brand-accent">
                {doc.topics.join(" · ")}
              </p>
            )}
          </header>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border w-full sm:w-fit overflow-x-auto">
            {[
              { id: "summary", label: "Resumen Ejecutivo" },
              { id: "actions", label: "Puntos Clave y Acciones" },
              { id: "source", label: "Extracto Original" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ReaderTab)}
                  className={`h-9 px-3.5 rounded-lg text-[13px] font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 ${
                    active
                      ? "bg-brand-primary text-white shadow-sm"
                      : "text-brand-dark dark:text-night-text hover:bg-white/80 dark:hover:bg-night-elevated"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div key={activeTab} className="animate-fade-up">
            {doc.needsSummaryGeneration && activeTab === "summary" ? (
              <div className="rounded-2xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <OctyMascot pose="thinking" size={56} className="shrink-0" />
                <div className="space-y-1">
                  <p className="font-display text-[15px] font-semibold text-brand-dark dark:text-night-text">
                    Octy está generando el resumen de este documento...
                  </p>
                  <p className="text-[13px] text-brand-dark/75 dark:text-night-text/70">
                    Consultando el texto extraído en el servidor y preparando los puntos clave.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {activeTab === "summary" && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {doc.executiveSummary
                        .split(/\n\n+/)
                        .map((paragraph, idx) => (
                          <p
                            key={idx}
                            className="text-[16px] leading-[27px] text-brand-dark/90 dark:text-night-text/90"
                          >
                            {paragraph}
                          </p>
                        ))}
                    </div>

                    {doc.keyPoints.length > 0 && (
                      <div className="pt-4 border-t border-brand-card/70 dark:border-night-border space-y-3">
                        <h2 className="font-display text-[16px] font-semibold text-brand-dark dark:text-night-text">
                          Hallazgos principales
                        </h2>
                        <ol className="space-y-2.5">
                          {doc.keyPoints.map((point, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-3 text-[14px] leading-[22px] text-brand-dark/85 dark:text-night-text/85"
                            >
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-light dark:bg-night-elevated border border-brand-card dark:border-night-border text-[11px] font-bold text-brand-dark dark:text-night-text tabular-nums">
                                {index + 1}
                              </span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "actions" && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h2 className="font-display text-[16px] font-semibold text-brand-dark dark:text-night-text">
                        Puntos Clave Sintetizados
                      </h2>
                      {doc.keyPoints.length === 0 ? (
                        <p className="text-[14px] text-brand-dark/70 dark:text-night-text/65">
                          No se registraron puntos clave adicionales.
                        </p>
                      ) : (
                        <ul className="space-y-2.5">
                          {doc.keyPoints.map((point, idx) => (
                            <li
                              key={idx}
                              className="rounded-xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border p-3.5 text-[14px] leading-[22px] text-brand-dark dark:text-night-text transition-colors hover:border-brand-accent dark:hover:border-night-accent"
                            >
                              <span className="font-bold mr-2 tabular-nums">
                                0{idx + 1}.
                              </span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h2 className="font-display text-[16px] font-semibold text-brand-dark dark:text-night-text">
                        Acciones y Responsables
                      </h2>
                      {doc.actionItems.length === 0 ? (
                        <p className="text-[14px] text-brand-dark/70 dark:text-night-text/65">
                          No se detectaron compromisos explícitos en este documento.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-brand-card dark:border-night-border">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-brand-light dark:bg-night-inset border-b border-brand-card dark:border-night-border text-[12px] font-semibold text-brand-dark dark:text-night-text">
                                <th className="py-2.5 px-4">Responsable</th>
                                <th className="py-2.5 px-4">Acción</th>
                                <th className="py-2.5 px-4 text-right">
                                  Prioridad
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-card/60 dark:divide-night-border text-[13px] text-brand-dark dark:text-night-text">
                              {doc.actionItems.map((item, idx) => (
                                <tr
                                  key={idx}
                                  className="hover:bg-brand-light/50 dark:hover:bg-night-elevated/50 transition-colors"
                                >
                                  <td className="py-3 px-4 font-semibold whitespace-nowrap">
                                    {item.owner}
                                  </td>
                                  <td className="py-3 px-4 text-brand-dark/85 dark:text-night-text/80">
                                    {item.task}
                                  </td>
                                  <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                                    {item.priority}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "source" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-brand-dark/70 dark:text-night-text/65">
                        Fragmento del texto fuente procesado
                      </p>
                      <button
                        type="button"
                        onClick={() => onViewOriginal(doc)}
                        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-primary dark:text-brand-accent hover:text-brand-dark dark:hover:text-white transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Abrir texto completo</span>
                      </button>
                    </div>
                    <div className="rounded-2xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border p-5 text-[13px] leading-[23px] text-brand-dark/90 dark:text-night-text/90 whitespace-pre-wrap">
                      {doc.sourceExcerpt || "Sin extracto disponible."}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </article>

        <aside className="xl:col-span-4 space-y-6">
          <div className="rounded-2xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border p-5 space-y-4 shadow-sm">
            <h2 className="font-display text-[14px] font-semibold text-brand-dark dark:text-night-text">
              Métricas de síntesis
            </h2>
            <div className="grid grid-cols-2 gap-3 tabular-nums">
              <div className="rounded-xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border p-3 transition-colors hover:border-brand-accent dark:hover:border-night-accent">
                <p className="text-[11px] font-semibold text-brand-dark/70 dark:text-night-text/65">
                  Original
                </p>
                <p className="mt-0.5 text-[18px] font-bold text-brand-dark dark:text-night-text">
                  {doc.wordCountOriginal.toLocaleString("es-ES")} pal.
                </p>
              </div>
              <div className="rounded-xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border p-3 transition-colors hover:border-brand-accent dark:hover:border-night-accent">
                <p className="text-[11px] font-semibold text-brand-dark/70 dark:text-night-text/65">
                  Resumen
                </p>
                <p className="mt-0.5 text-[18px] font-bold text-brand-dark dark:text-night-text">
                  {doc.wordCountSummary.toLocaleString("es-ES")} pal.
                </p>
              </div>
              <div className="rounded-xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border p-3 transition-colors hover:border-brand-accent dark:hover:border-night-accent">
                <p className="text-[11px] font-semibold text-brand-dark/70 dark:text-night-text/65">
                  Reducción
                </p>
                <p className="mt-0.5 text-[18px] font-bold text-brand-primary dark:text-brand-accent">
                  -{reductionPct}%
                </p>
              </div>
              <div className="rounded-xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border p-3 transition-colors hover:border-brand-accent dark:hover:border-night-accent">
                <p className="text-[11px] font-semibold text-brand-dark/70 dark:text-night-text/65">
                  Lectura
                </p>
                <p className="mt-0.5 text-[18px] font-bold text-brand-dark dark:text-night-text">
                  {doc.readingTimeMinutes} min
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border">
                <OctyMascot pose="waving" size={38} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-[14px] font-semibold text-brand-dark dark:text-night-text">
                    Consultar con Octy
                  </h2>
                  <span className="rounded-full bg-brand-light dark:bg-night-elevated border border-brand-card dark:border-night-border px-2 py-0.5 text-[10px] font-bold text-brand-primary dark:text-brand-accent">
                    Próximamente
                  </span>
                </div>
                <p className="text-[12px] text-brand-dark/70 dark:text-night-text/65 mt-0.5">
                  Chat interactivo sobre este documento en desarrollo.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-brand-light/70 dark:bg-night-inset border border-brand-card dark:border-night-border p-3 text-[12px] leading-[18px] text-brand-dark/75 dark:text-night-text/70">
              Muy pronto podrás hacerle preguntas directas a Octy sobre cifras, cláusulas y responsabilidades de este documento.
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[14px] font-semibold text-brand-dark dark:text-night-text">
                Acceso compartido
              </h2>
              <button
                type="button"
                onClick={() => onShare(doc)}
                className="text-[12px] font-semibold text-brand-primary dark:text-brand-accent hover:text-brand-dark dark:hover:text-white transition-colors"
              >
                Gestionar
              </button>
            </div>

            {doc.sharedWith.length === 0 ? (
              <p className="text-[13px] text-brand-dark/70 dark:text-night-text/65">
                {doc.isOwnedByMe
                  ? "Solo tú tienes acceso a este resumen."
                  : `Compartido contigo por ${doc.ownerName}.`}
              </p>
            ) : (
              <div className="space-y-2">
                {doc.sharedWith.map((entry) => {
                  const user = workspaceUsers.find((u) => u.id === entry.userId);
                  if (!user) return null;
                  return (
                    <div
                      key={entry.userId}
                      className="flex items-center justify-between gap-2 text-[13px]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-card dark:bg-night-elevated text-[11px] font-bold text-brand-dark dark:text-night-text">
                          {user.initials}
                        </span>
                        <span className="truncate font-medium text-brand-dark dark:text-night-text">
                          {user.name}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-dark/70 dark:text-night-text/70 shrink-0">
                        <UserCheck className="h-3.5 w-3.5 text-brand-primary dark:text-brand-accent" />
                        {entry.permission}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}