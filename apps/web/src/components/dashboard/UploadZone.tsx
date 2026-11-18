import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  AlertCircle,
  FileText,
  FileUp,
  FolderInput,
  Loader2,
} from "lucide-react";
import { summaryService } from "../../services/summaryService";
import type { SummaryDocument, User } from "../../types/summary";
import {
  formatBytes,
  inferFileFormat,
  validateSourceFile,
} from "../../utils/summaryFiles";

interface UploadZoneProps {
  currentUser: User;
  onDocumentSynthesized: (doc: SummaryDocument) => void;
  onImportSummaryFile: (file: File) => Promise<unknown>;
  onOpenPasteImport: () => void;
}

export function UploadZone({
  currentUser,
  onDocumentSynthesized,
  onImportSummaryFile,
  onOpenPasteImport,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isProcessing) return;
    const timer = window.setInterval(() => {
      setProgress((prev) => (prev < 88 ? prev + 9 : prev));
    }, 320);
    return () => window.clearInterval(timer);
  }, [isProcessing]);

  const processDocumentFile = async (file: File) => {
    setErrorMsg(null);
    try {
      validateSourceFile(file);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Archivo no compatible."
      );
      if (uploadInputRef.current) uploadInputRef.current.value = "";
      return;
    }

    setIsProcessing(true);
    setProcessingLabel(file.name);
    setProgress(15);

    try {
      const fileType = inferFileFormat(file.name, file.type);
      const newDoc = await summaryService.synthesize({
        file,
        fileName: file.name,
        fileType,
        mimeType: file.type || (fileType === "PDF" ? "application/pdf" : "image/jpeg"),
        fileSizeLabel: formatBytes(file.size),
        depth: "executive",
        currentUser,
      });

      setProgress(100);
      onDocumentSynthesized(newDoc);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "No fue posible procesar el documento seleccionado."
      );
    } finally {
      setIsProcessing(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  const handleUploadFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || isProcessing) return;
    void processDocumentFile(files[0]);
  };

  const handleImportChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      await onImportSummaryFile(file);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "No se pudo importar el archivo de resumen."
      );
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    handleUploadFiles(e.dataTransfer.files);
  };

  return (
    <section aria-label="Zona de carga e importación de documentos">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-5 sm:p-8 lg:p-10 text-center transition-all duration-150 ${
          isDragOver
            ? "bg-brand-card border-brand-primary shadow-azure-dropzone scale-[1.005]"
            : "bg-brand-card/35 border-brand-accent hover:bg-brand-card/45"
        }`}
      >
        <input
          ref={uploadInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          onChange={(e) => handleUploadFiles(e.target.files)}
          className="hidden"
          aria-label="Subir documento PDF, PNG, JPG o JPEG para resumir"
        />

        <input
          ref={importInputRef}
          type="file"
          accept=".json,.md,.markdown,.txt"
          onChange={handleImportChange}
          className="hidden"
          aria-label="Importar archivo de resumen previamente exportado"
        />

        <div className="mx-auto flex max-w-2xl flex-col items-center">
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-150 ${
              isDragOver || isProcessing
                ? "bg-brand-primary text-white scale-105"
                : "bg-white border border-brand-accent text-brand-primary"
            }`}
          >
            {isProcessing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <FileUp className="h-6 w-6" />
            )}
          </div>

          <h2 className="font-display text-[17px] sm:text-[20px] font-semibold tracking-[-0.01em] text-brand-dark">
            {isProcessing
              ? `Procesando "${processingLabel}"...`
              : isDragOver
                ? "Suelta el archivo para resumirlo inmediatamente"
                : "Arrastra un PDF o imagen (PNG, JPG, JPEG) para resumirlo"}
          </h2>

          <p className="mt-2 text-[13px] sm:text-[14px] text-brand-dark/80">
            Al soltar un archivo válido se procesa automáticamente y aparece en{" "}
            <span className="font-semibold text-brand-dark">Mis Resúmenes</span>.
          </p>

          {isProcessing && (
            <div className="mt-5 w-full max-w-md space-y-1.5">
              <div className="h-2 w-full rounded-full bg-brand-card overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[12px] font-semibold text-brand-dark tabular-nums">
                Generando resumen · {progress}%
              </p>
            </div>
          )}

          <div className="mt-6 w-full sm:w-auto flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-2.5 sm:gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => uploadInputRef.current?.click()}
              className="inline-flex h-11 sm:h-[42px] items-center justify-center gap-2 rounded-lg bg-brand-primary px-5 text-[14px] font-semibold text-white transition-all duration-150 hover:bg-brand-dark disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent whitespace-nowrap"
            >
              <FileUp className="h-4 w-4" />
              <span>Subir archivo</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => importInputRef.current?.click()}
              className="inline-flex h-11 sm:h-[42px] items-center justify-center gap-2 rounded-lg bg-white border border-brand-accent px-4 text-[14px] font-semibold text-brand-dark transition-all duration-150 hover:bg-brand-light hover:border-brand-primary disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent whitespace-nowrap"
            >
              <FolderInput className="h-4 w-4 text-brand-primary" />
              <span>Importar</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={onOpenPasteImport}
              className="inline-flex h-11 sm:h-[42px] items-center justify-center gap-2 rounded-lg bg-white border border-brand-card px-4 text-[14px] font-semibold text-brand-dark transition-all duration-150 hover:border-brand-accent hover:text-brand-primary disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent whitespace-nowrap"
            >
              <FileText className="h-4 w-4" />
              <span>Pegar texto</span>
            </button>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mt-4 w-full max-w-lg rounded-xl bg-white border border-brand-dark px-4 py-3 flex items-start gap-2.5 text-left text-[13px] font-medium text-brand-dark"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-brand-primary" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}