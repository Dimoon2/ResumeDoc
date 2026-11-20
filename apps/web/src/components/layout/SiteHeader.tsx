import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="site-header">
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="ResumeDoc, inicio">
          <span className="brand-mark">
            <FileText size={20} strokeWidth={2.2} />
          </span>
          <span>
            Resume<span className="brand-accent">Doc</span>
          </span>
        </Link>

        <div className="nav-right">
          <nav className={`nav-links ${menuOpen ? "is-open" : ""}`}>
            <a href="/#como-funciona" onClick={() => setMenuOpen(false)}>
              Cómo funciona
            </a>
            <a href="/#beneficios" onClick={() => setMenuOpen(false)}>
              Beneficios
            </a>
            <Link
              to="/login"
              className="nav-login"
              onClick={() => setMenuOpen(false)}
            >
              Iniciar sesión
            </Link>
            <Link
              to="/registro"
              className="button button-primary button-small"
              onClick={() => setMenuOpen(false)}
            >
              Crear cuenta
            </Link>
          </nav>

          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle-btn"
            aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            title={isDark ? "Modo claro" : "Modo oscuro"}
            aria-pressed={isDark}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button
            className="mobile-menu-button"
            type="button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  );
}