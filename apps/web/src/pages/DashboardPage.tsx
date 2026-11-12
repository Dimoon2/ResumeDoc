import { FileText, LogOut, Plus, Search, UploadCloud } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <a className="brand" href="/"><span className="brand-mark"><FileText size={20} /></span><span>Resume<span className="brand-accent">Doc</span></span></a>
        <div className="workspace-user">
          <span className="avatar">{user?.name?.charAt(0).toUpperCase() ?? "U"}</span>
          <span>{user?.name}</span>
          <button 
            className="icon-button" 
            onClick={async () => {await logout(); navigate("/", { replace: true });}} 
            aria-label="Cerrar sesión"><LogOut 
            size={18} 
          /></button>
        </div>
      </header>
      <section className="workspace-content">

        <div className="workspace-title">
          <div>
            <span className="auth-kicker">TU ESPACIO DE TRABAJO</span>
            <h1>Hola, {user?.name?.split(" ")[0] ?? "bienvenido"}.</h1>
            <p>Organiza tus documentos y encuentra lo que necesitas.</p>
          </div>
          <button className="button button-primary" type="button"><Plus size={17} /> Subir documento</button>
        </div>

        <div className="workspace-toolbar">
          <div className="search-box"><Search size={17} />
          <input placeholder="Buscar documentos..." aria-label="Buscar documentos" />
          </div>
          <span className="muted-label">Mis documentos</span>
        </div>

        <div className="empty-state">
          <div className="empty-icon"><UploadCloud size={28} /></div>
          <h2>Tu espacio empieza aquí</h2>
          <p>Cuando subas un documento, podrás consultar su texto extraído, resumen y visualizaciones desde este espacio.</p>
          <button className="button button-primary" type="button"><Plus size={17} /> Subir primer documento</button>
          <small>PDF, PNG o JPG</small>
        </div>

      </section>
    </main>
  );
}
