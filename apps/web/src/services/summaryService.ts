import { apiRequest } from "./apiClient";
import { documentService } from "./documentService";
import type { AuthUser } from "../types/auth";
import type {
  ActionItem,
  BackendSummaryResponse,
  FileFormat,
  SummaryDocument,
  SynthesisDepth,
} from "../types/summary";
import { formatSpanishDate } from "../utils/summaryFiles";

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function pollDocumentUntilCompleted(documentId: number): Promise<void> {
  for (let attempt = 0; attempt < 90; attempt++) {
    const status = await documentService.getStatus(documentId);
    if (status.status === "completed") return;
    if (status.status === "error") {
      throw new Error(status.error || "Error al procesar el documento.");
    }
    await wait(1200);
  }
  throw new Error("El procesamiento del documento excedió el tiempo de espera.");
}

function mapActionItems(
  rawItems: Array<Record<string, string>> | undefined
): ActionItem[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((item) => ({
      owner: String(item.owner || item.responsable || "Equipo"),
      task: String(item.task || item.accion || item.description || ""),
      priority: String(item.priority || item.prioridad || "Media"),
    }))
    .filter((item) => item.task.trim().length > 0);
}

export function mapBackendSummaryToDocument(params: {
  backendId?: number;
  summary: BackendSummaryResponse;
  fileName: string;
  fileType: FileFormat;
  fileSizeLabel: string;
  mimeType?: string;
  originalUrl?: string;
  currentUser: AuthUser;
}): SummaryDocument {
  const { summary } = params;
  const cleanTitle = params.fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ");

  return {
    id:
      params.backendId !== undefined
        ? String(params.backendId)
        : summary.id || `summary-text-${Date.now()}`,
    backendId: params.backendId,
    pipelineStatus: "completed",
    title: cleanTitle || params.fileName,
    fileName: params.fileName,
    fileType: params.fileType,
    fileSizeLabel: params.fileSizeLabel,
    mimeType: params.mimeType,
    originalUrl: params.originalUrl,
    createdAt: formatSpanishDate(new Date()),
    ownerId: String(params.currentUser.id),
    ownerName: params.currentUser.name,
    isOwnedByMe: true,
    executiveSummary: summary.executive_summary,
    keyPoints: Array.isArray(summary.key_points) ? summary.key_points : [],
    actionItems: mapActionItems(summary.action_items),
    topics: Array.isArray(summary.topics) ? summary.topics : [],
    wordCountOriginal: summary.word_count_original,
    wordCountSummary: summary.word_count_summary,
    readingTimeMinutes: Math.max(1, summary.reading_time_minutes || 1),
    sourceExcerpt: summary.source_excerpt,
    sharedWith: [],
  };
}

export const summaryService = {
  /**
   * Flujo real completo:
   * - Si hay archivo: POST /documents -> polling /status -> POST /documents/{id}/summary
   * - Si es texto pegado: POST /summaries/text
   */
  async synthesize(params: {
    file?: File;
    fileName: string;
    fileType: FileFormat;
    mimeType: string;
    fileSizeLabel: string;
    textContent?: string;
    depth: SynthesisDepth;
    currentUser: AuthUser;
  }): Promise<SummaryDocument> {
    if (params.file) {
      const originalUrl = URL.createObjectURL(params.file);
      const uploaded = await documentService.upload(params.file);

      await pollDocumentUntilCompleted(uploaded.id);

      const summary = await documentService.summarize(
        uploaded.id,
        params.depth
      );

      return mapBackendSummaryToDocument({
        backendId: uploaded.id,
        summary,
        fileName: params.fileName,
        fileType: params.fileType,
        fileSizeLabel: params.fileSizeLabel,
        mimeType: params.mimeType,
        originalUrl,
        currentUser: params.currentUser,
      });
    }

    const summary = await apiRequest<BackendSummaryResponse>(
      "/summaries/text",
      {
        method: "POST",
        body: JSON.stringify({
          fileName: params.fileName,
          textContent: params.textContent ?? "",
          depth: params.depth,
        }),
      }
    );

    return mapBackendSummaryToDocument({
      summary,
      fileName: params.fileName,
      fileType: params.fileType,
      fileSizeLabel: params.fileSizeLabel,
      mimeType: params.mimeType,
      currentUser: params.currentUser,
    });
  },

  /** Genera el resumen para un documento ya subido y completado en el backend. */
  async generateForExistingDocument(
    documentId: number,
    depth: SynthesisDepth = "executive"
  ): Promise<BackendSummaryResponse> {
    return documentService.summarize(documentId, depth);
  },
};