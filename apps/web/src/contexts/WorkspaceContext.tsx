import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { documentService } from "../services/documentService";
import {
  mapBackendSummaryToDocument,
  summaryService,
} from "../services/summaryService";
import type { DocumentItem } from "../types/document";
import type {
  ActiveNavSection,
  BackendSummaryResponse,
  ExportFormat,
  SharedAccessEntry,
  SummaryDocument,
  User,
} from "../types/summary";
import {
  downloadExportFile,
  formatBytes,
  formatSpanishDate,
  inferFileFormat,
  parseImportedSummaryFile,
} from "../utils/summaryFiles";

interface WorkspaceContextValue {
  currentUser: User;
  users: User[];
  documents: SummaryDocument[];
  isLoadingDocuments: boolean;
  loadError: string | null;
  activeNav: ActiveNavSection;
  selectedSharedUserId: string | null;
  activeDocumentId: string | null;
  searchQuery: string;
  toastMessage: string | null;
  setActiveNav: (nav: ActiveNavSection) => void;
  setSelectedSharedUserId: (userId: string | null) => void;
  setActiveDocumentId: (docId: string | null) => void;
  openDocument: (doc: SummaryDocument) => Promise<void>;
  refreshDocuments: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  dismissToast: () => void;
  showToast: (message: string) => void;
  addDocument: (doc: SummaryDocument) => void;
  deleteDocument: (docId: string) => Promise<void>;
  updateDocumentShare: (
    docId: string,
    nextSharedWith: SharedAccessEntry[]
  ) => void;
  importSummaryFile: (file: File) => Promise<SummaryDocument>;
  exportDocumentDirect: (doc: SummaryDocument, format?: ExportFormat) => void;
  selectNavSection: (nav: ActiveNavSection) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined
);

function readSummaryCache(key: string): Record<number, BackendSummaryResponse> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<number, BackendSummaryResponse>) : {};
  } catch {
    return {};
  }
}

function writeSummaryCache(
  key: string,
  cache: Record<number, BackendSummaryResponse>
) {
  try {
    localStorage.setItem(key, JSON.stringify(cache));
  } catch {
    // Ignorar errores de cuota
  }
}

function readLocalDocsCache(key: string): SummaryDocument[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SummaryDocument[]) : [];
  } catch {
    return [];
  }
}

function writeLocalDocsCache(key: string, docs: SummaryDocument[]) {
  try {
    localStorage.setItem(key, JSON.stringify(docs));
  } catch {
    // Ignorar errores de cuota
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();

  const currentUser: User = useMemo(() => {
    const name = authUser?.name?.trim() || "Usuario";
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");

    return {
      id: String(authUser?.id ?? "guest"),
      name,
      initials: initials || "U",
      role: "Usuario",
      department: "ResumeDoc",
      email: authUser?.email ?? "",
    };
  }, [authUser]);

  const summaryCacheKey = `resumedoc.summaries.v1.${currentUser.id}`;
  const localOnlyDocsKey = `resumedoc.local_docs.v1.${currentUser.id}`;

  const [documents, setDocuments] = useState<SummaryDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<ActiveNavSection>("my-summaries");
  const [selectedSharedUserId, setSelectedSharedUserId] = useState<string | null>(
    null
  );
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mapBackendItemToDoc = useCallback(
    (
      item: DocumentItem,
      cache: Record<number, BackendSummaryResponse>
    ): SummaryDocument => {
      const cachedSummary = cache[item.id];
      const fileType = inferFileFormat(item.name);
      const sizeLabel = formatBytes(item.size_bytes);

      if (cachedSummary) {
        return mapBackendSummaryToDocument({
          backendId: item.id,
          summary: cachedSummary,
          fileName: item.name,
          fileType,
          fileSizeLabel: sizeLabel,
          currentUser: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
          },
        });
      }

      const statusLabel =
        item.status === "completed"
          ? "Documento procesado. Haz clic en «Abrir» para generar su resumen."
          : item.status === "error"
            ? item.error || "Ocurrió un error al procesar este documento."
            : "Documento en procesamiento en segundo plano...";

      return {
        id: String(item.id),
        backendId: item.id,
        pipelineStatus: item.status,
        pipelineError: item.error,
        needsSummaryGeneration: item.status === "completed",
        title: item.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
        fileName: item.name,
        fileType,
        fileSizeLabel: sizeLabel,
        createdAt: formatSpanishDate(new Date()),
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        isOwnedByMe: true,
        executiveSummary: statusLabel,
        keyPoints: [],
        actionItems: [],
        topics: [fileType],
        wordCountOriginal: 0,
        wordCountSummary: 0,
        readingTimeMinutes: 1,
        sourceExcerpt: "",
        sharedWith: [],
      };
    },
    [currentUser]
  );

  const refreshDocuments = useCallback(async () => {
    setIsLoadingDocuments(true);
    setLoadError(null);
    try {
      const items = await documentService.list();
      const summaryCache = readSummaryCache(summaryCacheKey);
      const localDocs = readLocalDocsCache(localOnlyDocsKey);

      const backendMapped = items
        .slice()
        .reverse()
        .map((item) => mapBackendItemToDoc(item, summaryCache));

      setDocuments([...localDocs, ...backendMapped]);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar tus documentos desde el servidor."
      );
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [mapBackendItemToDoc, summaryCacheKey, localOnlyDocsKey]);

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (message: string) => setToastMessage(message);
  const dismissToast = () => setToastMessage(null);

  const persistSummaryInCache = useCallback(
    (doc: SummaryDocument) => {
      if (doc.backendId !== undefined && !doc.needsSummaryGeneration) {
        const cache = readSummaryCache(summaryCacheKey);
        cache[doc.backendId] = {
          id: `summary-${doc.backendId}`,
          executive_summary: doc.executiveSummary,
          key_points: doc.keyPoints,
          action_items: doc.actionItems.map((a) => ({
            owner: a.owner,
            task: a.task,
            priority: a.priority,
          })),
          topics: doc.topics,
          word_count_original: doc.wordCountOriginal,
          word_count_summary: doc.wordCountSummary,
          reading_time_minutes: doc.readingTimeMinutes,
          source_excerpt: doc.sourceExcerpt,
        };
        writeSummaryCache(summaryCacheKey, cache);
      } else if (doc.backendId === undefined) {
        const currentLocal = readLocalDocsCache(localOnlyDocsKey);
        const updated = [
          doc,
          ...currentLocal.filter((existing) => existing.id !== doc.id),
        ];
        writeLocalDocsCache(localOnlyDocsKey, updated);
      }
    },
    [summaryCacheKey, localOnlyDocsKey]
  );

  const addDocument = (doc: SummaryDocument) => {
    persistSummaryInCache(doc);
    setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
  };

  const openDocument = async (doc: SummaryDocument) => {
    setActiveDocumentId(doc.id);

    if (doc.backendId !== undefined && doc.needsSummaryGeneration) {
      try {
        const summary = await summaryService.generateForExistingDocument(
          doc.backendId,
          "executive"
        );
        const hydrated = mapBackendSummaryToDocument({
          backendId: doc.backendId,
          summary,
          fileName: doc.fileName,
          fileType: doc.fileType,
          fileSizeLabel: doc.fileSizeLabel,
          mimeType: doc.mimeType,
          originalUrl: doc.originalUrl,
          currentUser: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
          },
        });
        persistSummaryInCache(hydrated);
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? hydrated : d))
        );
      } catch (err) {
        showToast(
          err instanceof Error
            ? err.message
            : "No se pudo generar el resumen del documento."
        );
      }
    }
  };

  const deleteDocument = async (docId: string) => {
    const target = documents.find((d) => d.id === docId);
    if (!target) return;

    if (target.backendId !== undefined) {
      try {
        await documentService.remove(target.backendId);
        const cache = readSummaryCache(summaryCacheKey);
        delete cache[target.backendId];
        writeSummaryCache(summaryCacheKey, cache);
      } catch (err) {
        showToast(
          err instanceof Error
            ? err.message
            : "No se pudo eliminar el documento."
        );
        return;
      }
    } else {
      const localDocs = readLocalDocsCache(localOnlyDocsKey).filter(
        (d) => d.id !== docId
      );
      writeLocalDocsCache(localOnlyDocsKey, localDocs);
    }

    if (target.originalUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(target.originalUrl);
    }

    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    if (activeDocumentId === docId) {
      setActiveDocumentId(null);
    }
    showToast("Resumen eliminado de Mis Resúmenes.");
  };

  const updateDocumentShare = (
    docId: string,
    nextSharedWith: SharedAccessEntry[]
  ) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, sharedWith: nextSharedWith } : d
      )
    );
  };

  const importSummaryFile = async (file: File): Promise<SummaryDocument> => {
    const importedDoc = await parseImportedSummaryFile(file, currentUser);
    addDocument(importedDoc);
    setActiveNav("my-summaries");
    setActiveDocumentId(null);
    showToast(`Resumen importado: "${importedDoc.title}".`);
    return importedDoc;
  };

  const exportDocumentDirect = (
    doc: SummaryDocument,
    format: ExportFormat = "txt"
  ) => {
    const downloadedName = downloadExportFile(doc, format);
    showToast(`Archivo descargado: ${downloadedName}`);
  };

  const selectNavSection = (nav: ActiveNavSection) => {
    setActiveNav(nav);
    setActiveDocumentId(null);
    if (nav !== "shared") {
      setSelectedSharedUserId(null);
    }
  };

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      currentUser,
      users: [], // Sin usuarios mock hasta que exista endpoint de compartidos
      documents,
      isLoadingDocuments,
      loadError,
      activeNav,
      selectedSharedUserId,
      activeDocumentId,
      searchQuery,
      toastMessage,
      setActiveNav,
      setSelectedSharedUserId,
      setActiveDocumentId,
      openDocument,
      refreshDocuments,
      setSearchQuery,
      dismissToast,
      showToast,
      addDocument,
      deleteDocument,
      updateDocumentShare,
      importSummaryFile,
      exportDocumentDirect,
      selectNavSection,
    }),
    [
      currentUser,
      documents,
      isLoadingDocuments,
      loadError,
      activeNav,
      selectedSharedUserId,
      activeDocumentId,
      searchQuery,
      toastMessage,
      refreshDocuments,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace debe utilizarse dentro de WorkspaceProvider.");
  }
  return ctx;
}