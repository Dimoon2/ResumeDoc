import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, LayoutGrid, List, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import type { FileFormat, SummaryDocument } from "../../types/summary";
import { OctyMascot } from "../ui/OctyMascot";
import { DashboardLayout } from "./DashboardLayout";
import { DocumentCard } from "./DocumentCard";
import { LibraryTableView } from "./LibraryTableView";
import { SharedUsersView } from "./SharedUsersView";
import { SynthesisReaderView } from "./SynthesisReaderView";
import { UploadZone } from "./UploadZone";
import { ExportModal } from "./modals/ExportModal";
import { ImportPreviewModal } from "./modals/ImportPreviewModal";
import { OriginalDocumentModal } from "./modals/OriginalDocumentModal";
import { ShareModal } from "./modals/ShareModal";

export function DashboardWorkspace() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const {
    currentUser,
    users,
    documents,
    isLoadingDocuments,
    loadError,
    activeNav,
    selectedSharedUserId,
    activeDocumentId,
    searchQuery,
    toastMessage,
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
    setSelectedSharedUserId,
  } = useWorkspace();

  const [formatFilter, setFormatFilter] = useState<"ALL" | FileFormat>("ALL");
  const [cardLayout, setCardLayout] = useState<"grid" | "list">("grid");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportTargetDoc, setExportTargetDoc] = useState<SummaryDocument | null>(
    null
  );
  const [originalTargetDoc, setOriginalTargetDoc] =
    useState<SummaryDocument | null>(null);
  const [shareTargetDocId, setShareTargetDocId] = useState<string | null>(null);

  const isAnyModalOpen =
    importModalOpen ||
    Boolean(exportTargetDoc) ||
    Boolean(originalTargetDoc) ||
    Boolean(shareTargetDocId);

  useEffect(() => {
    if (!isAnyModalOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isAnyModalOpen]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchesSearch = (doc: SummaryDocument) => {
    if (!normalizedQuery) return true;
    return (
      doc.title.toLowerCase().includes(normalizedQuery) ||
      doc.fileName.toLowerCase().includes(normalizedQuery) ||
      doc.executiveSummary.toLowerCase().includes(normalizedQuery) ||
      doc.topics.some((t) => t.toLowerCase().includes(normalizedQuery)) ||
      doc.ownerName.toLowerCase().includes(normalizedQuery)
    );
  };

  const myDocuments = useMemo(
    () =>
      documents.filter(
        (d) =>
          d.isOwnedByMe &&
          matchesSearch(d) &&
          (formatFilter === "ALL" || d.fileType === formatFilter)
      ),
    [documents, normalizedQuery, formatFilter]
  );

  const sharedDocumentsAll = useMemo(
    () => documents.filter((d) => !d.isOwnedByMe),
    [documents]
  );

  const sharedDocumentsFiltered = useMemo(
    () => sharedDocumentsAll.filter(matchesSearch),
    [sharedDocumentsAll, normalizedQuery]
  );

  const accessibleUsersCount = useMemo(
    () =>
      users.filter((u) =>
        sharedDocumentsAll.some((d) => d.sharedByUserId === u.id)
      ).length,
    [users, sharedDocumentsAll]
  );

  const libraryDocuments = useMemo(
    () => documents.filter(matchesSearch),
    [documents, normalizedQuery]
  );

  const activeDocument = useMemo(
    () => documents.find((d) => d.id === activeDocumentId) ?? null,
    [documents, activeDocumentId]
  );

  const shareTargetDoc = useMemo(
    () => documents.find((d) => d.id === shareTargetDocId) ?? null,
    [documents, shareTargetDocId]
  );

  const breadcrumb = useMemo(() => {
    if (activeDocument) {
      return [
        "Espacio de trabajo",
        activeDocument.isOwnedByMe ? "Mis Resúmenes" : "Compartidos",
        activeDocument.title,
      ];
    }
    if (activeNav === "my-summaries") {
      return ["Espacio de trabajo", "Mis Resúmenes"];
    }
    if (activeNav === "shared") {
      const user = users.find((u) => u.id === selectedSharedUserId);
      return user
        ? ["Espacio de trabajo", "Compartidos", user.name]
        : ["Espacio de trabajo", "Compartidos"];
    }
    return ["Espacio de trabajo", "Biblioteca Completa"];
  }, [activeDocument, activeNav, selectedSharedUserId, users]);

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const handleDocumentSynthesizedInline = (newDoc: SummaryDocument) => {
    addDocument(newDoc);
    selectNavSection("my-summaries");
    showToast(`Documento resumido y añadido a Mis Resúmenes: "${newDoc.title}".`);
  };

  const handleSynthesisModalComplete = (newDoc: SummaryDocument) => {
    addDocument(newDoc);
    setImportModalOpen(false);
    selectNavSection("my-summaries");
    setActiveDocumentId(newDoc.id);
    showToast(`Resumen generado: "${newDoc.title}".`);
  };

  const myDocsTotal = documents.filter((d) => d.isOwnedByMe).length;

  return (
    <DashboardLayout
      activeNav={activeNav}
      onSelectNav={selectNavSection}
      currentUser={currentUser}
      myDocsCount={myDocsTotal}
      sharedUsersCount={accessibleUsersCount}
      totalDocsCount={documents.length}
      breadcrumb={breadcrumb}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onOpenNewUpload={() => setImportModalOpen(true)}
      onLogout={handleLogout}
      mobileOpen={mobileMenuOpen}
      onOpenMobile={() => setMobileMenuOpen(true)}
      onCloseMobile={() => setMobileMenuOpen(false)}
      toastMessage={toastMessage}
      onDismissToast={dismissToast}
    >
      <div
        key={activeDocument ? activeDocument.id : activeNav}
        className="animate-fade-up"
      >
        {activeDocument ? (
          <SynthesisReaderView
            doc={activeDocument}
            workspaceUsers={users}
            onBack={() => setActiveDocumentId(null)}
            onViewOriginal={(doc) => setOriginalTargetDoc(doc)}
            onExport={(doc) => setExportTargetDoc(doc)}
            onShare={(doc) => setShareTargetDocId(doc.id)}
          />
        ) : activeNav === "my-summaries" ? (
          <div className="space-y-8 sm:space-y-10">
            <UploadZone
              currentUser={currentUser}
              onDocumentSynthesized={handleDocumentSynthesizedInline}
              onImportSummaryFile={importSummaryFile}
            />

            <section aria-label="Mis Resúmenes" className="space-y-5 sm:space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                  <h1 className="font-display text-[22px] sm:text-[28px] font-semibold leading-[30px] sm:leading-[36px] tracking-[-0.015em] text-brand-dark dark:text-night-text">
                    Mis Resúmenes
                  </h1>
                  <p className="mt-1 text-[14px] text-brand-dark/75 dark:text-night-text/70">
                    Resúmenes generados e importados, listos para revisión, consulta del original y exportación.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border overflow-x-auto max-w-full shadow-sm">
                    {(["ALL", "PDF", "PNG", "JPG"] as const).map((fmt) => {
                      const active = formatFilter === fmt;
                      return (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setFormatFilter(fmt)}
                          className={`h-8 px-3 rounded-lg text-[12px] font-semibold transition-all duration-150 active:scale-[0.97] whitespace-nowrap shrink-0 ${
                            active
                              ? "bg-brand-primary text-white shadow-sm"
                              : "text-brand-dark dark:text-night-text hover:bg-brand-light dark:hover:bg-night-elevated"
                          }`}
                        >
                          {fmt === "ALL" ? "Todos" : fmt}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border shrink-0 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setCardLayout("grid")}
                      aria-label="Vista en cuadrícula"
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-95 ${
                        cardLayout === "grid"
                          ? "bg-brand-primary text-white shadow-sm"
                          : "text-brand-dark dark:text-night-text hover:bg-brand-light dark:hover:bg-night-elevated"
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardLayout("list")}
                      aria-label="Vista en lista"
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 active:scale-95 ${
                        cardLayout === "list"
                          ? "bg-brand-primary text-white shadow-sm"
                          : "text-brand-dark dark:text-night-text hover:bg-brand-light dark:hover:bg-night-elevated"
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {isLoadingDocuments ? (
                <div className="rounded-2xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border p-10 text-center space-y-3 shadow-sm">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-primary dark:text-brand-accent" />
                  <p className="text-[14px] font-semibold text-brand-dark dark:text-night-text">
                    Cargando tus documentos desde el servidor...
                  </p>
                </div>
              ) : loadError ? (
                <div className="rounded-2xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border p-8 sm:p-10 text-center space-y-4 shadow-sm">
                  <OctyMascot pose="error" size={52} className="mx-auto" />
                  <div className="space-y-1">
                    <h2 className="font-display text-[16px] font-semibold text-brand-dark dark:text-night-text">
                      No se pudo conectar con el servidor
                    </h2>
                    <p className="text-[14px] text-brand-dark/70 dark:text-night-text/65 max-w-md mx-auto">
                      {loadError}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshDocuments()}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-primary px-4 text-[13px] font-semibold text-white hover:bg-brand-dark dark:hover:bg-[#519EE2] transition-all duration-150 active:scale-[0.98]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Reintentar</span>
                  </button>
                </div>
              ) : myDocuments.length === 0 ? (
                <div className="animate-fade-up rounded-2xl bg-white dark:bg-night-surface border border-brand-card dark:border-night-border p-8 sm:p-12 text-center space-y-3 shadow-sm">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light dark:bg-night-elevated text-brand-primary dark:text-brand-accent">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h2 className="font-display text-[16px] font-semibold text-brand-dark dark:text-night-text">
                    No se encontraron resúmenes
                  </h2>
                  <p className="text-[14px] text-brand-dark/70 dark:text-night-text/65 max-w-md mx-auto">
                    {normalizedQuery || formatFilter !== "ALL"
                      ? "Ajusta tu búsqueda o cambia el filtro de formato para ver tus documentos."
                      : "Arrastra un archivo PDF o imagen (PNG, JPG, JPEG) o importa un resumen exportado para comenzar."}
                  </p>
                  {(normalizedQuery || formatFilter !== "ALL") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setFormatFilter("ALL");
                      }}
                      className="inline-flex h-10 items-center rounded-xl bg-brand-light dark:bg-night-inset border border-brand-card dark:border-night-border px-4 text-[13px] font-semibold text-brand-dark dark:text-night-text hover:border-brand-accent dark:hover:border-brand-accent hover:text-brand-primary dark:hover:text-brand-accent transition-all duration-150 active:scale-[0.98]"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : cardLayout === "list" ? (
                <div className="space-y-4">
                  {myDocuments.map((doc, idx) => (
                    <div
                      key={doc.id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${Math.min(idx, 6) * 45}ms` }}
                    >
                      <DocumentCard
                        doc={doc}
                        layout="list"
                        onOpenDocument={(d) => void openDocument(d)}
                        onViewOriginal={(d) => setOriginalTargetDoc(d)}
                        onQuickExport={(d) => exportDocumentDirect(d, "txt")}
                        onOpenExportModal={(d) => setExportTargetDoc(d)}
                        onShareDocument={(d) => setShareTargetDocId(d.id)}
                        onDeleteDocument={(id) => void deleteDocument(id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {myDocuments.map((doc, idx) => (
                    <div
                      key={doc.id}
                      className="animate-fade-up h-full"
                      style={{ animationDelay: `${Math.min(idx, 6) * 45}ms` }}
                    >
                      <DocumentCard
                        doc={doc}
                        layout="grid"
                        onOpenDocument={(d) => void openDocument(d)}
                        onViewOriginal={(d) => setOriginalTargetDoc(d)}
                        onQuickExport={(d) => exportDocumentDirect(d, "txt")}
                        onOpenExportModal={(d) => setExportTargetDoc(d)}
                        onShareDocument={(d) => setShareTargetDocId(d.id)}
                        onDeleteDocument={(id) => void deleteDocument(id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : activeNav === "shared" ? (
          <SharedUsersView
            users={users}
            selectedUserId={selectedSharedUserId}
            onSelectUser={setSelectedSharedUserId}
            sharedDocuments={sharedDocumentsFiltered}
            onOpenDocument={(d) => void openDocument(d)}
            onViewOriginal={(d) => setOriginalTargetDoc(d)}
            onQuickExport={(d) => exportDocumentDirect(d, "txt")}
            onOpenExportModal={(d) => setExportTargetDoc(d)}
            onShareDocument={(d) => setShareTargetDocId(d.id)}
          />
        ) : (
          <LibraryTableView
            documents={libraryDocuments}
            onOpenDocument={(d) => void openDocument(d)}
            onViewOriginal={(d) => setOriginalTargetDoc(d)}
            onQuickExport={(d) => exportDocumentDirect(d, "txt")}
            onShareDocument={(d) => setShareTargetDocId(d.id)}
          />
        )}
      </div>

      <ImportPreviewModal
        isOpen={importModalOpen}
        currentUser={currentUser}
        onClose={() => setImportModalOpen(false)}
        onSynthesisComplete={handleSynthesisModalComplete}
      />

      <OriginalDocumentModal
        doc={originalTargetDoc}
        onClose={() => setOriginalTargetDoc(null)}
      />

      <ExportModal
        key={exportTargetDoc?.id}
        doc={exportTargetDoc}
        onClose={() => setExportTargetDoc(null)}
        onDownloaded={(fileName) => showToast(`Archivo descargado: ${fileName}`)}
      />

      <ShareModal
        key={shareTargetDoc?.id}
        doc={shareTargetDoc}
        workspaceUsers={users}
        onClose={() => setShareTargetDocId(null)}
        onUpdateShare={updateDocumentShare}
      />
    </DashboardLayout>
  );
}