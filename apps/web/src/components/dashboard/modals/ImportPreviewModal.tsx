import { useEffect, useRef, useState } from "react";
import { AlertCircle, FileText, FileUp, Loader2, X } from "lucide-react";
import { summaryService } from "../../../services/summaryService";
import type {
  SummaryDocument,
  SynthesisDepth,
  User,
} from "../../../types/summary";
import {
  formatBytes,
  inferFileFormat,
  validateSourceFile,
} from "../../../utils/summaryFiles";

const SAMPLE_PASTE_TEXT = `INFORME EJECUTIVO DE EXPANSIÓN LOGÍSTICA — CORREDOR ATLÁNTICO 2027

1. Resumen de Situación
Durante los últimos doce meses, el volumen de envíos B2B hacia nodos de distribución en Lisboa, Oporto y Bilbao creció un 31% interanual. La capacidad actual en el centro de consolidación de Valladolid opera al 89% de su límite máximo en semanas pico.

2. Propuesta de Inversión y Cronograma
Se propone habilitar una plataforma logística satélite de 4.200 m² en Oporto equipada con lectores automatizados y muelles de carga cruzada.
- Inversión inicial en equipamiento y sistemas: 380.000 €.
- Ahorro neto estimado: 215.000 € anuales a partir del mes 4.
- Fecha objetivo de puesta en marcha: 15 de abril de 2027.`;

interface ImportPreviewModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onSynthesisComplete: (newDoc: SummaryDocument) => void;
}

export function ImportPreviewModal({
  isOpen,
  currentUser,
  onClose,
  onSynthesisComplete,
}: ImportPreviewModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("Documento_Ejecutivo.pdf");
  const [pastedText, setPastedText] = useState("");
  const [depth, setDepth] = useState<SynthesisDepth>("executive");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setProgress(0);
    setSelectedFile(null);
    setFileName("Documento_Ejecutivo.pdf");
    setPastedText("");
  }, [isOpen]);

  useEffect(() => {
    if (!isGenerating) return;
    const timer = window.setInterval(() => {
      setProgress((prev) => (prev < 88 ? prev + 8 : prev));
    }, 350);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  if (!isOpen) return null;

  const effectiveFileType = selectedFile
    ? inferFileFormat(selectedFile.name, selectedFile.type)
    : "PDF";

  const handleSelectFile = (file: File | undefined) => {
    if (!file) return;
    setErrorMsg(null);
    try {
      validateSourceFile(file);
      setSelectedFile(file);
      setFileName(file.name);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Archivo no válido.");
    }
  };

  const handleLoadSample = () => {
    setSelectedFile(null);
    setFileName("Expansion_Logistica_Atlantico_2027.pdf");
    setPastedText(SAMPLE_PASTE_TEXT);
    setErrorMsg(null);
  };

  const handleGenerate = async () => {
    setErrorMsg(null);

    if (!selectedFile && !pastedText.trim()) {
      setErrorMsg(
        "Adjunta un archivo (PDF, PNG, JPG, JPEG) o pega texto antes de resumir."
      );
      return;
    }

    setIsGenerating(true);
    setProgress(18);

    try {
      const fileSizeLabel = selectedFile
        ? formatBytes(selectedFile.size)
        : `${Math.max(1, Math.round(pastedText.length / 1024))} KB`;

      const newDoc = await summaryService.synthesize({
        file: selectedFile ?? undefined,
        fileName: fileName.trim() || "Documento.pdf",
        fileType: effectiveFileType,
        mimeType: selectedFile?.type || "application/pdf",
        fileSizeLabel,
        textContent: selectedFile ? undefined : pastedText,
        depth,
        currentUser,
      });

      setProgress(100);
      onSynthesisComplete(newDoc);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Error de conexión al resumir el documento."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-brand-dark/25 backdrop-blur-[2px] overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-white border border-brand-card shadow-azure-active overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-brand-card bg-brand-light flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-brand-card text-brand-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="import-modal-title"
                className="font-display text-[16px] sm:text-[18px] font-semibold text-brand-dark truncate"
              >
                Generar nuevo resumen
              </h2>
              <p className="text-[12px] text-brand-dark/70 truncate">
                Adjunta un PDF/imagen o pega contenido y elige el nivel de detalle.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            aria-label="Cerrar ventana"
            className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg text-brand-dark hover:bg-brand-card/40 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto overscroll-contain">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={(e) => handleSelectFile(e.target.files?.[0])}
            className="hidden"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="import-filename"
                className="block text-[12px] font-semibold text-brand-dark mb-1.5"
              >
                Nombre del documento
              </label>
              <input
                id="import-filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                disabled={isGenerating}
                className="h-[42px] w-full rounded-lg bg-white border border-brand-card px-3 text-[14px] text-brand-dark focus:outline-none focus:border-brand-primary focus:border-[1.5px]"
              />
            </div>

            <div>
              <span className="block text-[12px] font-semibold text-brand-dark mb-1.5">
                Archivo origen (PDF, PNG, JPG, JPEG)
              </span>
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => fileInputRef.current?.click()}
                className="h-[42px] w-full flex items-center justify-between rounded-lg bg-brand-light border border-brand-card px-3.5 text-[13px] font-semibold text-brand-dark hover:border-brand-accent transition-colors"
              >
                <span className="inline-flex items-center gap-2 truncate">
                  <FileUp className="h-4 w-4 text-brand-primary shrink-0" />
                  <span className="truncate">
                    {selectedFile ? selectedFile.name : "Seleccionar archivo"}
                  </span>
                </span>
                <span className="text-brand-dark/70 tabular-nums shrink-0 ml-2">
                  {selectedFile ? formatBytes(selectedFile.size) : effectiveFileType}
                </span>
              </button>
            </div>
          </div>

          <div>
            <span className="block text-[12px] font-semibold text-brand-dark mb-2">
              Nivel de síntesis
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 p-1 rounded-xl bg-brand-light border border-brand-card">
              {[
                { id: "executive", label: "Ejecutivo" },
                { id: "detailed", label: "Detallado" },
                { id: "bullets", label: "Puntos Clave" },
              ].map((option) => {
                const active = depth === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setDepth(option.id as SynthesisDepth)}
                    className={`h-10 sm:h-9 rounded-lg text-[13px] font-semibold transition-all duration-150 whitespace-nowrap ${
                      active
                        ? "bg-brand-primary text-white"
                        : "text-brand-dark hover:bg-white/70"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedFile ? (
            <div className="rounded-2xl bg-brand-light border border-brand-card p-5 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p className="text-[14px] font-semibold text-brand-dark">
                  Archivo listo para analizar ({effectiveFileType})
                </p>
                <p className="text-[13px] text-brand-dark/75 truncate">
                  {selectedFile.name} · {formatBytes(selectedFile.size)}
                </p>
              </div>
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => setSelectedFile(null)}
                className="text-[12px] font-semibold text-brand-primary hover:text-brand-dark underline"
              >
                Quitar archivo
              </button>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="import-text-content"
                  className="text-[12px] font-semibold text-brand-dark"
                >
                  O pega el contenido del documento
                </label>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  disabled={isGenerating}
                  className="text-[12px] font-semibold text-brand-primary hover:text-brand-dark underline underline-offset-2"
                >
                  Cargar informe de ejemplo
                </button>
              </div>
              <textarea
                id="import-text-content"
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                disabled={isGenerating}
                placeholder="Pega aquí actas, contratos, especificaciones o informes para resumir..."
                className="w-full rounded-xl bg-white border border-brand-card p-3.5 text-[14px] leading-[22px] text-brand-dark placeholder:text-brand-accent focus:outline-none focus:border-brand-primary focus:border-[1.5px]"
              />
            </div>
          )}

          {isGenerating && (
            <div className="space-y-2 rounded-xl bg-brand-light border border-brand-card p-4">
              <div className="flex items-center justify-between text-[13px] font-semibold text-brand-dark">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                  <span>Generando resumen...</span>
                </span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-brand-card overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl bg-brand-light border border-brand-dark p-3.5 flex items-start gap-2.5 text-[13px] font-medium text-brand-dark"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-brand-primary" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-brand-card bg-brand-light flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="h-11 sm:h-[42px] rounded-lg bg-white border border-brand-card px-4 text-[14px] font-semibold text-brand-dark hover:border-brand-accent hover:text-brand-primary transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex h-11 sm:h-[42px] items-center gap-2 rounded-lg bg-brand-primary px-5 text-[14px] font-semibold text-white transition-all duration-150 hover:bg-brand-dark disabled:opacity-60 whitespace-nowrap"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <span>Generar Resumen</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}