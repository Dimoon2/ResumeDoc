import type { DocumentStatus } from "./document";

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

export interface BackendSummaryResponse {
  id: string;
  executive_summary: string;
  key_points: string[];
  action_items: Array<Record<string, string>>;
  topics: string[];
  word_count_original: number;
  word_count_summary: number;
  reading_time_minutes: number;
  source_excerpt: string;
}

export interface SummaryDocument {
  id: string;
  backendId?: number;
  pipelineStatus?: DocumentStatus;
  pipelineError?: string;
  needsSummaryGeneration?: boolean;
  title: string;
  fileName: string;
  fileType: FileFormat;
  fileSizeLabel: string;
  mimeType?: string;
  originalUrl?: string;
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
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export type ActiveNavSection = "my-summaries" | "shared" | "library";