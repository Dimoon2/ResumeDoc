import type {
  ActionItem,
  ExportFormat,
  FileFormat,
  SummaryDocument,
  User,
} from "../types/summary";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatSpanishDate(date = new Date()): string {
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function inferFileFormat(value: string, mimeType = ""): FileFormat {
  const lower = value.trim().toLowerCase();
  const mime = mimeType.trim().toLowerCase();

  if (lower === "png" || lower.endsWith(".png") || mime === "image/png") {
    return "PNG";
  }

  if (
    lower === "jpg" ||
    lower === "jpeg" ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    mime === "image/jpeg"
  ) {
    return "JPG";
  }

  return "PDF";
}

/** Valida que el archivo subido sea PDF, PNG, JPG o JPEG. */
export function validateSourceFile(file: File): void {
  const lower = file.name.toLowerCase();
  const validExt =
    lower.endsWith(".pdf") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg");

  const validMime =
    file.type === "" ||
    file.type === "application/pdf" ||
    file.type === "image/png" ||
    file.type === "image/jpeg";

  if (!validExt || !validMime) {
    throw new Error(
      "Formato no admitido. Sube un archivo PDF, PNG, JPG o JPEG."
    );
  }

  if (file.size === 0) {
    throw new Error("El archivo seleccionado está vacío.");
  }
}

export function buildExportContent(
  doc: SummaryDocument,
  format: ExportFormat
): string {
  if (format === "json") {
    return JSON.stringify(
      {
        titulo: doc.title,
        archivoOriginal: doc.fileName,
        formato: doc.fileType,
        tamano: doc.fileSizeLabel,
        fecha: doc.createdAt,
        autor: doc.ownerName,
        temas: doc.topics,
        resumenEjecutivo: doc.executiveSummary,
        puntosClave: doc.keyPoints,
        acciones: doc.actionItems,
        palabrasOriginal: doc.wordCountOriginal,
        palabrasResumen: doc.wordCountSummary,
      },
      null,
      2
    );
  }

  if (format === "txt") {
    const actionsText =
      doc.actionItems.length > 0
        ? `\nACCIONES Y RESPONSABLES\n${doc.actionItems
            .map((a, i) => `${i + 1}. [${a.priority}] ${a.task} — ${a.owner}`)
            .join("\n")}\n`
        : "";

    return `${doc.title}
Archivo: ${doc.fileName} (${doc.fileType} · ${doc.fileSizeLabel})
Fecha: ${doc.createdAt} · Autor: ${doc.ownerName}
Temas: ${doc.topics.join(" · ")}

RESUMEN EJECUTIVO
${doc.executiveSummary}

PUNTOS CLAVE
${doc.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}
${actionsText}`;
  }

  const actionsMd =
    doc.actionItems.length > 0
      ? `\n## Acciones y Responsables\n${doc.actionItems
          .map((a) => `- **${a.owner}** (${a.priority}): ${a.task}`)
          .join("\n")}\n`
      : "";

  return `# ${doc.title}

- **Archivo origen:** ${doc.fileName} (${doc.fileType}, ${doc.fileSizeLabel})
- **Fecha de síntesis:** ${doc.createdAt}
- **Responsable:** ${doc.ownerName}
- **Temas:** ${doc.topics.join(" · ")}

## Resumen Ejecutivo
${doc.executiveSummary}

## Puntos Clave
${doc.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}
${actionsMd}`;
}

export function downloadExportFile(
  doc: SummaryDocument,
  format: ExportFormat = "txt"
): string {
  const content = buildExportContent(doc, format);
  const ext = format === "markdown" ? "md" : format;
  const mime =
    format === "json"
      ? "application/json;charset=utf-8"
      : format === "markdown"
        ? "text/markdown;charset=utf-8"
        : "text/plain;charset=utf-8";

  const safeSlug = doc.title
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñ]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  const downloadName = `${safeSlug || "resumen"}.${ext}`;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return downloadName;
}

/**
 * RF-04 / CA-04: Parsea un archivo de resumen previamente exportado (.json, .md o .txt)
 * y lo convierte en un SummaryDocument válido para "Mis Resúmenes".
 */
export async function parseImportedSummaryFile(
  file: File,
  currentUser: User
): Promise<SummaryDocument> {
  const raw = (await file.text()).trim();
  if (!raw) {
    throw new Error("El archivo importado está vacío.");
  }

  const lower = file.name.toLowerCase();
  const baseTitle = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  const fileSizeLabel = formatBytes(file.size);
  const createdAt = formatSpanishDate(new Date());

  // 1. Formato JSON exportado
  if (lower.endsWith(".json") || raw.startsWith("{")) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new Error("El archivo JSON no tiene un formato de resumen válido.");
    }

    const executiveSummary =
      typeof parsed.resumenEjecutivo === "string"
        ? parsed.resumenEjecutivo
        : typeof parsed.executiveSummary === "string"
          ? parsed.executiveSummary
          : "";

    if (!executiveSummary) {
      throw new Error(
        "El archivo JSON no contiene un resumen ejecutivo reconocible."
      );
    }

    const keyPoints = Array.isArray(parsed.puntosClave)
      ? parsed.puntosClave.map(String)
      : Array.isArray(parsed.keyPoints)
        ? parsed.keyPoints.map(String)
        : [];

    const actionItems: ActionItem[] = Array.isArray(parsed.acciones)
      ? (parsed.acciones as ActionItem[])
      : Array.isArray(parsed.actionItems)
        ? (parsed.actionItems as ActionItem[])
        : [];

    const topics = Array.isArray(parsed.temas)
      ? parsed.temas.map(String)
      : Array.isArray(parsed.topics)
        ? parsed.topics.map(String)
        : ["Importado"];

    const summaryWords = executiveSummary.split(/\s+/).filter(Boolean).length;
    const originFileName = String(
      parsed.archivoOriginal || parsed.fileName || `${baseTitle}.pdf`
    );

    return {
      id: `doc-imp-${Date.now()}`,
      title: String(parsed.titulo || parsed.title || baseTitle),
      fileName: originFileName,
      fileType: inferFileFormat(
        String(parsed.formato || originFileName)
      ),
      fileSizeLabel: String(parsed.tamano || fileSizeLabel),
      createdAt,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      isOwnedByMe: true,
      executiveSummary,
      keyPoints,
      actionItems,
      topics,
      wordCountOriginal: Number(parsed.palabrasOriginal) || summaryWords * 8,
      wordCountSummary: Number(parsed.palabrasResumen) || summaryWords,
      readingTimeMinutes: Math.max(1, Math.round(summaryWords / 150)),
      sourceExcerpt: raw.slice(0, 3000),
      sharedWith: [],
    };
  }

  // 2. Formato Markdown exportado
  if (lower.endsWith(".md") || lower.endsWith(".markdown") || raw.startsWith("# ")) {
    const titleMatch = raw.match(/^#\s+(.+)$/m);
    const originMatch = raw.match(/\*\*Archivo origen:\*\*\s*([^\n(]+)/i);
    const topicsMatch = raw.match(/\*\*Temas:\*\*\s*(.+)$/m);

    const summarySection = raw.match(
      /##\s*Resumen Ejecutivo\s*\n([\s\S]*?)(?=\n##\s|$)/i
    );
    const pointsSection = raw.match(
      /##\s*Puntos Clave\s*\n([\s\S]*?)(?=\n##\s|$)/i
    );

    const executiveSummary = (summarySection?.[1] || raw).trim();
    const keyPoints = pointsSection?.[1]
      ? pointsSection[1]
          .split("\n")
          .map((line) => line.replace(/^\s*(?:\d+\.|[-*])\s*/, "").trim())
          .filter(Boolean)
      : [];

    const summaryWords = executiveSummary.split(/\s+/).filter(Boolean).length;
    const originFileName = originMatch?.[1]?.trim() || `${baseTitle}.pdf`;

    return {
      id: `doc-imp-${Date.now()}`,
      title: titleMatch?.[1]?.trim() || baseTitle,
      fileName: originFileName,
      fileType: inferFileFormat(originFileName),
      fileSizeLabel,
      createdAt,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      isOwnedByMe: true,
      executiveSummary,
      keyPoints,
      actionItems: [],
      topics: topicsMatch?.[1]
        ? topicsMatch[1].split("·").map((t) => t.trim()).filter(Boolean)
        : ["Importado"],
      wordCountOriginal: Math.max(120, summaryWords * 8),
      wordCountSummary: summaryWords,
      readingTimeMinutes: Math.max(1, Math.round(summaryWords / 150)),
      sourceExcerpt: raw.slice(0, 3000),
      sharedWith: [],
    };
  }

  // 3. Formato TXT exportado (o texto plano)
  const lines = raw.split(/\r?\n/);
  const firstLine = lines[0]?.trim() || baseTitle;
  const originTxtMatch = raw.match(/^Archivo:\s*([^\n(]+)/im);

  const summarySection = raw.match(
    /RESUMEN EJECUTIVO\s*\n([\s\S]*?)(?=\nPUNTOS CLAVE|\nACCIONES Y RESPONSABLES|$)/i
  );
  const pointsSection = raw.match(
    /PUNTOS CLAVE\s*\n([\s\S]*?)(?=\nACCIONES Y RESPONSABLES|$)/i
  );

  const executiveSummary = (summarySection?.[1] || raw).trim();
  const keyPoints = pointsSection?.[1]
    ? pointsSection[1]
        .split("\n")
        .map((line) => line.replace(/^\s*(?:\d+\.|[-*])\s*/, "").trim())
        .filter(Boolean)
    : [];

  const summaryWords = executiveSummary.split(/\s+/).filter(Boolean).length;
  const originFileName = originTxtMatch?.[1]?.trim() || `${baseTitle}.pdf`;

  return {
    id: `doc-imp-${Date.now()}`,
    title: summarySection ? firstLine : baseTitle,
    fileName: originFileName,
    fileType: inferFileFormat(originFileName),
    fileSizeLabel,
    createdAt,
    ownerId: currentUser.id,
    ownerName: currentUser.name,
    isOwnedByMe: true,
    executiveSummary,
    keyPoints,
    actionItems: [],
    topics: ["Resumen importado"],
    wordCountOriginal: Math.max(100, summaryWords * 8),
    wordCountSummary: summaryWords,
    readingTimeMinutes: Math.max(1, Math.round(summaryWords / 150)),
    sourceExcerpt: raw.slice(0, 3000),
    sharedWith: [],
  };
}