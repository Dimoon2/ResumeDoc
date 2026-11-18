export type FileFormat = "PDF" | "PNG" | "JPG";

export type SynthesisDepth = "executive" | "detailed" | "bullets";

export type SharePermission = "Lectura" | "Exportar" | "Editor";

export type ExportFormat = "txt" | "markdown" | "json";

export interface ActionItem {
  owner: string;
  task: string;
  priority: "Alta" | "Media" | "Baja" | string;
}

export interface SharedAccessEntry {
  userId: string;
  permission: SharePermission;
  sharedAt: string;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: string;
  email: string;
}

export interface SummaryDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: FileFormat;
  fileSizeLabel: string;
  createdAt: string;
  ownerId: string;
  ownerName: string;
  isOwnedByMe: boolean;
  sharedByUserId?: string;
  sharedPermission?: SharePermission;
  executiveSummary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  topics: string[];
  wordCountOriginal: number;
  wordCountSummary: number;
  readingTimeMinutes: number;
  sourceExcerpt: string;
  sharedWith: SharedAccessEntry[];
  mimeType?: string;
  originalUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export type ActiveNavSection = "my-summaries" | "shared" | "library";