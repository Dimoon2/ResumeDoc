import { Link, Outlet } from "react-router-dom";
import { FileText, Moon, ShieldCheck, Sun } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

export default function AuthLayout() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <main className="auth-shell">
      <section className="auth-aside">
        <Link to="/" className="brand auth-brand">
          <span className="brand-mark">
            <FileText size={20} />
          </span>
          <span>
            Resume<span className="brand-accent">Doc</span>
          </span>
        </Link>
        <div className="auth-aside-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> INFORMACIÓN MÁS CLARA
          </div>
          <h1>Menos tiempo leyendo. Más tiempo entendiendo.</h1>
          <p>
            Convierte documentos extensos en información clara, organizada y
            visual.
          </p>
          <div className="auth-illustration" aria-hidden="true">
            <div className="illustration-paper">
              <div className="paper-top">
                <span />
                <span />
                <span />
              </div>
              <div className="paper-line line-long" />
              <div className="paper-line" />
              <div className="paper-line line-short" />
              <div className="paper-chart">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="paper-line line-long" />
            </div>
            <div className="floating-note">
              <ShieldCheck size={17} /> Tu información organizada
            </div>
          </div>
        </div>
        <span className="auth-aside-footer">
          ResumeDoc · Plataforma de análisis documental
        </span>
      </section>

      <section className="auth-main">
        <div className="auth-theme-bar">
          <div className="auth-mobile-brand">
            <Link to="/" className="brand">
              <span className="brand-mark">
                <FileText size={20} />
              </span>
              <span>
                Resume<span className="brand-accent">Doc</span>
              </span>
            </Link>
          </div>

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
        </div>

        <Outlet />
        <p className="auth-legal">
          Al continuar, aceptas las condiciones de uso de la plataforma.
        </p>
      </section>
    </main>
  );
}