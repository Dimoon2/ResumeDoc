export type DocumentStatus = "pending" | "processing" | "completed" | "error";

export interface DocumentItem {
  id: number;
  name: string;
  size_bytes: number;
  status: DocumentStatus;
  error: string;
}

export interface UploadedDocumentResponse {
  id: number;
  status: "pending";
}

export interface DocumentStatusResponse {
  id: number;
  status: DocumentStatus;
  error: string;
}