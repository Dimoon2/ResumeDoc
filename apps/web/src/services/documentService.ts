import { apiRequest, apiRequestText } from "./apiClient";
import type {
  DocumentItem,
  DocumentStatusResponse,
  UploadedDocumentResponse,
} from "../types/document";

export const documentService = {
  /** Lista los documentos del usuario (o todos si es admin). */
  list(): Promise<DocumentItem[]> {
    return apiRequest<DocumentItem[]>("/documents", { method: "GET" });
  },

  /** Sube un archivo (.pdf, .png, .jpg, .jpeg). El campo DEBE llamarse "file". */
  upload(file: File): Promise<UploadedDocumentResponse> {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest<UploadedDocumentResponse>("/documents", {
      method: "POST",
      body: formData,
    });
  },

  /** Obtiene metadatos y estado de un documento. */
  getById(documentId: number): Promise<DocumentItem> {
    return apiRequest<DocumentItem>(`/documents/${documentId}`, {
      method: "GET",
    });
  },

  /** Endpoint ligero para hacer polling mientras está en pending/processing. */
  getStatus(documentId: number): Promise<DocumentStatusResponse> {
    return apiRequest<DocumentStatusResponse>(`/documents/${documentId}/status`, {
      method: "GET",
    });
  },

  /** Lee el texto extraído (solo cuando status === "completed", devuelve texto plano). */
  getText(documentId: number): Promise<string> {
    return apiRequestText(`/documents/${documentId}/text`, {
      method: "GET",
    });
  },

  /** Sobreescribe el texto extraído con la versión editada por el usuario. */
  updateText(documentId: number, text: string): Promise<void> {
    return apiRequest<void>(`/documents/${documentId}/text`, {
      method: "PUT",
      body: JSON.stringify({ text }),
    });
  },

  /** Cambia el nombre visible del documento (1 a 255 caracteres). */
  rename(documentId: number, name: string): Promise<DocumentItem> {
    return apiRequest<DocumentItem>(`/documents/${documentId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  },

  /** Elimina documento, archivo y estado (falla con 409 si está en "processing"). */
  remove(documentId: number): Promise<void> {
    return apiRequest<void>(`/documents/${documentId}`, {
      method: "DELETE",
    });
  },
};