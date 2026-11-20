import { apiRequest } from "./apiClient";
import { documentService } from "./documentService";
import type { AuthUser } from "../types/auth";
import type {
  FileFormat,
  SummaryDocument,
  SynthesisDepth,
} from "../types/summary";
import { formatSpanishDate } from "../utils/summaryFiles";

const USE_MOCK_SUMMARY =
  import.meta.env.VITE_USE_MOCK_SUMMARY === "true" ||
  (import.meta.env.VITE_USE_MOCK_SUMMARY !== "false" &&
    import.meta.env.VITE_USE_MOCK_AUTH !== "false");

interface SummaryApiResponse {
  id: string;
  executive_summary: string;
  key_points: string[];
  action_items: Array<{ owner: string; task: string; priority: string }>;
  topics: string[];
  word_count_original: number;
  word_count_summary: number;
  reading_time_minutes: number;
  source_excerpt: string;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function toSummaryDocument(
  raw: SummaryApiResponse,
  params: {
    file?: File;
    fileName: string;
    fileType: FileFormat;
    mimeType: string;
    fileSizeLabel: string;
    currentUser: AuthUser;
  },
  originalUrl?: string,
): SummaryDocument {
  return {
    id: raw.id,
    title:
      params.fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") ||
      "Documento sin título",
    fileName: params.fileName,
    fileType: params.fileType,
    fileSizeLabel: params.fileSizeLabel,
    mimeType: params.mimeType,
    originalUrl,
    createdAt: new Date().toISOString(),
    ownerId: String(params.currentUser.id),
    ownerName: params.currentUser.name,
    isOwnedByMe: true,
    executiveSummary: raw.executive_summary,
    keyPoints: raw.key_points,
    actionItems: raw.action_items.map((action) => ({
      owner: action.owner,
      task: action.task,
      priority:
        action.priority === "Alta" || action.priority === "Baja"
          ? action.priority
          : "Media",
    })),
    topics: raw.topics,
    wordCountOriginal: raw.word_count_original,
    wordCountSummary: raw.word_count_summary,
    readingTimeMinutes: raw.reading_time_minutes,
    sourceExcerpt: raw.source_excerpt,
    sharedWith: [],
  };
}

async function pollDocumentUntilCompleted(documentId: number): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const status = await documentService.getStatus(documentId);
    if (status.status === "completed") return;
    if (status.status === "error") {
      throw new Error(status.error || "Error al procesar el documento.");
    }
    await wait(1200);
  }
  throw new Error("El procesamiento del documento tardó demasiado.");
}

export const summaryService = {
  /**
   * Procesa un archivo (PDF, PNG, JPG, JPEG) o texto pegado y devuelve un resumen.
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
    const originalUrl = params.file
      ? URL.createObjectURL(params.file)
      : undefined;

    if (USE_MOCK_SUMMARY) {
      await wait(750);

      const cleanTitle = params.fileName
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]+/g, " ");

      const rawText =
        params.textContent?.trim() ||
        `Texto extraído mediante OCR/análisis de "${params.fileName}" (${params.fileType}, ${params.fileSizeLabel}).\n\nEste es un extracto de demostración generado en modo mock para validar la lectura, exportación y vista del documento original.`;

      const originalWords = Math.max(180, rawText.split(/\s+/).length * 4);
      const executiveSummary =
        params.textContent?.trim()
          ? `${rawText.slice(0, 420)}${rawText.length > 420 ? "..." : ""}`
          : `Síntesis generada para "${cleanTitle}" (${params.fileType}). El documento contiene información clave estructurada lista para consulta, exportación y compartición con el equipo.\n\nAl conectar el backend de resumen, este bloque mostrará la síntesis real producida a partir del texto extraído.`;

      const summaryWords = executiveSummary.split(/\s+/).filter(Boolean).length;

      return {
        id: `doc-${Date.now()}`,
        title: cleanTitle || "Documento sin título",
        fileName: params.fileName,
        fileType: params.fileType,
        fileSizeLabel: params.fileSizeLabel,
        mimeType: params.mimeType,
        originalUrl,
        createdAt: formatSpanishDate(new Date()),
        ownerId: String(params.currentUser.id),
        ownerName: params.currentUser.name,
        isOwnedByMe: true,
        executiveSummary,
        keyPoints: [
          `Formato procesado correctamente: ${params.fileType} (${params.fileSizeLabel}).`,
          `Nivel de síntesis aplicado: ${
            params.depth === "executive"
              ? "Ejecutivo"
              : params.depth === "detailed"
                ? "Detallado"
                : "Puntos Clave"
          }.`,
          "Documento disponible para ver archivo original, exportar o compartir.",
        ],
        actionItems: [
          {
            owner: params.currentUser.name,
            task: "Revisar los hallazgos principales y compartir con los responsables.",
            priority: "Media",
          },
        ],
        topics: [params.fileType, "Síntesis", "ResumeDoc"],
        wordCountOriginal: originalWords,
        wordCountSummary: summaryWords,
        readingTimeMinutes: Math.max(1, Math.round(summaryWords / 150)),
        sourceExcerpt: rawText.slice(0, 4000),
        sharedWith: [],
      };
    }

    // Flujo real cuando el backend esté listo:
    if (params.file) {
      const uploaded = await documentService.upload(params.file);
      await pollDocumentUntilCompleted(uploaded.id);
      const raw = await apiRequest<SummaryApiResponse>(
        `/documents/${uploaded.id}/summary`,
        {
          method: "POST",
          body: JSON.stringify({
            depth: params.depth,
          }),
        },
      );

      return toSummaryDocument(raw, params, originalUrl);
    }

    const raw = await apiRequest<SummaryApiResponse>("/summaries/text", {
      method: "POST",
      body: JSON.stringify({
        fileName: params.fileName,
        textContent: params.textContent,
        depth: params.depth,
      }),
    });

    return toSummaryDocument(raw, params);
  },

  /**
   * Consulta conversacional sobre un documento (mock hoy, listo para backend después).
   */
  async askDocument(payload: {
    documentId: string;
    documentTitle: string;
    documentContext: string;
    question: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
  }): Promise<{ answer: string }> {
    if (USE_MOCK_SUMMARY) {
      await wait(550);
      return {
        answer: `Respuesta de prueba sobre "${payload.documentTitle}": recibí tu consulta ("${payload.question}"). Cuando el endpoint del backend esté disponible, esta respuesta analizará el contenido real del documento.`,
      };
    }

    return apiRequest<{ answer: string }>(
      `/documents/${payload.documentId}/ask`,
      {
        method: "POST",
        body: JSON.stringify({
          question: payload.question,
          history: payload.history,
          documentContext: payload.documentContext,
        }),
      }
    );
  },
};
