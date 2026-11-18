import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  WORKSPACE_USERS,
  buildInitialDocuments,
} from "../data/mockWorkspaceData";
import type {
  ActiveNavSection,
  ExportFormat,
  SharedAccessEntry,
  SummaryDocument,
  User,
} from "../types/summary";
import {
  downloadExportFile,
  parseImportedSummaryFile,
} from "../utils/summaryFiles";

interface WorkspaceContextValue {
  currentUser: User;
  users: User[];
  documents: SummaryDocument[];
  activeNav: ActiveNavSection;
  selectedSharedUserId: string | null;
  activeDocumentId: string | null;
  searchQuery: string;
  toastMessage: string | null;
  setActiveNav: (nav: ActiveNavSection) => void;
  setSelectedSharedUserId: (userId: string | null) => void;
  setActiveDocumentId: (docId: string | null) => void;
  setSearchQuery: (query: string) => void;
  dismissToast: () => void;
  showToast: (message: string) => void;
  addDocument: (doc: SummaryDocument) => void;
  deleteDocument: (docId: string) => void;
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
      role: "Miembro",
      department: "Espacio de trabajo",
      email: authUser?.email ?? "",
    };
  }, [authUser]);

  const storageKey = `resumedoc.workspace.v1.${currentUser.id}`;

  const [documents, setDocuments] = useState<SummaryDocument[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as SummaryDocument[];
        }
      }
    } catch {
      // Fallback al seed inicial
    }
    return buildInitialDocuments(currentUser);
  });

  const [activeNav, setActiveNav] = useState<ActiveNavSection>("my-summaries");
  const [selectedSharedUserId, setSelectedSharedUserId] = useState<string | null>(
    null
  );
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Las blob: URLs no sobreviven recargas, se omiten al persistir
      const serializable = documents.map(({ originalUrl, ...rest }) =>
        originalUrl?.startsWith("blob:") ? rest : { ...rest, originalUrl }
      );
      localStorage.setItem(storageKey, JSON.stringify(serializable));
    } catch {
      // Ignorar errores de cuota de almacenamiento
    }
  }, [documents, storageKey]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (message: string) => setToastMessage(message);
  const dismissToast = () => setToastMessage(null);

  const addDocument = (doc: SummaryDocument) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const deleteDocument = (docId: string) => {
    setDocuments((prev) => {
      const target = prev.find((d) => d.id === docId);
      if (target?.originalUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(target.originalUrl);
      }
      return prev.filter((d) => d.id !== docId);
    });
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
    setDocuments((prev) => [importedDoc, ...prev]);
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
      users: WORKSPACE_USERS,
      documents,
      activeNav,
      selectedSharedUserId,
      activeDocumentId,
      searchQuery,
      toastMessage,
      setActiveNav,
      setSelectedSharedUserId,
      setActiveDocumentId,
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
      activeNav,
      selectedSharedUserId,
      activeDocumentId,
      searchQuery,
      toastMessage,
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