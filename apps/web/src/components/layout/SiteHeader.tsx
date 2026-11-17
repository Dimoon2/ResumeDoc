import { Link } from "react-router-dom";
import { FileText, Menu, X } from "lucide-react";
import { useState } from "react";

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="ResumeDoc, inicio">
          <span className="brand-mark"><FileText size={20} strokeWidth={2.2} /></span>
          <span>Resume<span className="brand-accent">Doc</span></span>
        </Link>

        <button
          className="mobile-menu-button"
          type="button"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>

        <nav className={`nav-links ${menuOpen ? "is-open" : ""}`}>
          <a href="/#como-funciona" onClick={() => setMenuOpen(false)}>Cómo funciona</a>
          <a href="/#beneficios" onClick={() => setMenuOpen(false)}>Beneficios</a>
          <Link to="/login" className="nav-login" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link>
          <Link to="/registro" className="button button-primary button-small" onClick={() => setMenuOpen(false)}>
            Crear cuenta
          </Link>
        </nav>
      </div>
    </header>
  );
}
