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
        mimeType:
          file.type || (fileType === "PDF" ? "application/pdf" : "image/jpeg"),
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
        className={`group rounded-2xl border-2 border-dashed p-5 sm:p-8 lg:p-10 text-center transition-all duration-200 ${
          isDragOver
            ? "bg-brand-card border-brand-primary shadow-azure-dropzone scale-[1.01]"
            : "bg-gradient-to-b from-white/75 to-brand-card/30 border-brand-accent hover:border-brand-primary/80 hover:from-white/90 hover:to-brand-card/40 hover:shadow-azure-floating"
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
            className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200 ${
              isDragOver || isProcessing
                ? "bg-brand-primary text-white scale-110 shadow-md shadow-brand-primary/30"
                : "bg-white border border-brand-accent text-brand-primary shadow-sm group-hover:-translate-y-1 group-hover:shadow-azure-floating"
            }`}
          >
            {isProcessing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <FileUp className="h-6 w-6" />
            )}
          </div>

          <h2 className="font-display text-[17px] sm:text-[21px] font-bold tracking-[-0.015em] text-brand-dark">
            {isProcessing
              ? `Procesando "${processingLabel}"...`
              : isDragOver
                ? "Suelta el archivo para resumirlo inmediatamente"
                : "Arrastra un PDF o imagen aquí para resumirlo"}
          </h2>

          <p className="mt-2 text-[13px] sm:text-[14px] text-brand-dark/80">
            Se procesará automáticamente y aparecerá en{" "}
            <span className="font-semibold text-brand-dark">Mis Resúmenes</span>.
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            {["PDF", "PNG", "JPG", "JPEG"].map((ext) => (
              <span
                key={ext}
                className="rounded-full bg-white/90 border border-brand-card px-2.5 py-0.5 text-[10px] font-bold tracking-[0.06em] text-brand-dark/80"
              >
                {ext}
              </span>
            ))}
          </div>

          {isProcessing && (
            <div className="mt-5 w-full max-w-md space-y-1.5 animate-fade-up">
              <div className="h-2.5 w-full rounded-full bg-brand-card overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-brand-primary transition-all duration-300 ease-out"
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
              className="inline-flex h-11 sm:h-[42px] items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-[14px] font-semibold text-white shadow-sm shadow-brand-primary/25 transition-all duration-200 hover:bg-brand-dark hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent whitespace-nowrap"
            >
              <FileUp className="h-4 w-4" />
              <span>Subir archivo</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => importInputRef.current?.click()}
              className="inline-flex h-11 sm:h-[42px] items-center justify-center gap-2 rounded-xl bg-white border border-brand-accent px-4 text-[14px] font-semibold text-brand-dark transition-all duration-200 hover:bg-brand-light hover:border-brand-primary hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent whitespace-nowrap"
            >
              <FolderInput className="h-4 w-4 text-brand-primary" />
              <span>Importar</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={onOpenPasteImport}
              className="inline-flex h-11 sm:h-[42px] items-center justify-center gap-2 rounded-xl bg-white border border-brand-card px-4 text-[14px] font-semibold text-brand-dark transition-all duration-200 hover:border-brand-accent hover:text-brand-primary hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent whitespace-nowrap"
            >
              <FileText className="h-4 w-4" />
              <span>Pegar texto</span>
            </button>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="animate-fade-up mt-4 w-full max-w-lg rounded-xl bg-white border border-brand-dark px-4 py-3 flex items-start gap-2.5 text-left text-[13px] font-medium text-brand-dark shadow-sm"
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